import { GraphQLError } from 'graphql';
import { StudyRow, SiteRow, ExaminerRow, ExaminerCertificateRow } from '../types';
import {
  findStudyById, findStudiesPaged, findSitesByStudyId, findExaminersByStudyId,
  countStudySites, countStudyExaminers, findClosedSiteForStudy, findActiveSiteForStudy,
  protocolIdExists, insertStudy, updateStudyById, findSiteForStudy,
  insertStudySite, deleteStudySite, studySiteExists, countSSEForStudySite,
  siteExaminerExists, insertSSE, deleteSSE,
  findSSERowsForStudy, findCertsByIds, findAvailableExaminersForSites,
} from '../repositories/studyRepository';
import { getCertificatesByExaminer, getCertificateById } from './examinerService';

// ── Policy flags ──────────────────────────────────────────────────────────
const STRICT_STUDY_COMPLETE_REQUIRES_NO_ACTIVE_SITES = true;
const STRICT_NO_SITE_UNASSIGN_WHEN_STUDY_ACTIVE = true;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Queries ───────────────────────────────────────────────────────────────

export function getStudiesPaged(page: number, pageSize: number): { rows: StudyRow[]; total: number } {
  return findStudiesPaged(pageSize, (page - 1) * pageSize);
}

export function getStudyById(id: number): StudyRow | null {
  return findStudyById(id);
}

export function getSitesByStudy(studyId: number): SiteRow[] {
  return findSitesByStudyId(studyId);
}

export function getExaminersByStudy(studyId: number): ExaminerRow[] {
  return findExaminersByStudyId(studyId);
}

// ── Create ────────────────────────────────────────────────────────────────

export interface CreateStudyInput {
  protocolId: string;
  title: string;
  sponsor: string;
  phase: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export function createStudy(input: CreateStudyInput): StudyRow {
  const today = todayUTC();

  if (input.startDate < today) {
    throw new GraphQLError('Start date cannot be in the past.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: 'Start date must be today or in the future.' } },
    });
  }
  if (input.endDate && input.endDate < input.startDate) {
    throw new GraphQLError('End date must be on or after start date.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: 'End date must be on or after start date.' } },
    });
  }
  if (protocolIdExists(input.protocolId)) {
    throw new GraphQLError('Protocol ID already exists', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { protocolId: 'Protocol ID must be unique' } },
    });
  }

  try {
    const id = insertStudy(
      input.protocolId, input.title, input.sponsor, input.phase,
      input.startDate, input.endDate ?? '', input.description ?? ''
    );
    return findStudyById(id)!;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed: studies.protocolId')) {
      throw new GraphQLError('Protocol ID already exists', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { protocolId: 'Protocol ID must be unique' } },
      });
    }
    throw new GraphQLError('Failed to create study', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// ── Update ────────────────────────────────────────────────────────────────

export interface UpdateStudyInput {
  title?: string;
  sponsor?: string;
  phase?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  description?: string;
}

const STATUS_ORDER: Record<string, number> = { Planned: 0, Active: 1, Completed: 2 };
const STUDY_UPDATE_COLUMNS = new Set(['title', 'sponsor', 'phase', 'startDate', 'endDate', 'status', 'description']);

function enforceStatusTransition(
  existing: StudyRow,
  newStatus: string,
  inputDates: { startDate?: string; endDate?: string }
): void {
  const from = existing.status;
  const to = newStatus;
  if (from === to) return;

  const today = todayUTC();
  const fromOrder = STATUS_ORDER[from] ?? -1;
  const toOrder = STATUS_ORDER[to] ?? -1;

  // S2: forward-only
  if (toOrder !== fromOrder + 1) {
    const allowed = from === 'Planned' ? 'Active' : from === 'Active' ? 'Completed' : 'none';
    throw new GraphQLError(
      `Invalid status transition: ${from} → ${to}. Allowed next status: ${allowed}.`,
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Cannot transition from ${from} to ${to}. Allowed: ${allowed}.` } } }
    );
  }

  if (to === 'Active') {
    // S3
    if (countStudySites(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned site before it can be set to Active.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one site before activating the study.' } },
      });
    }
    // S4
    if (countStudyExaminers(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned examiner before it can be set to Active.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner to a study site before activating.' } },
      });
    }
    // D7
    const closedSite = findClosedSiteForStudy(existing.id);
    if (closedSite) {
      throw new GraphQLError(`Cannot activate study: site "${closedSite.name}" is Closed. Remove or reopen it first.`, {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Site "${closedSite.name}" is Closed. Remove or reopen it before activating.` } },
      });
    }
    // D4
    const effectiveStart = inputDates.startDate ?? existing.startDate;
    if (effectiveStart && effectiveStart > today) {
      throw new GraphQLError('Cannot activate a study with a future start date.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: `Start date ${effectiveStart} is in the future. A study can only be activated on or after its start date.` } },
      });
    }
    // D5
    const effectiveEnd = inputDates.endDate ?? (existing.endDate || undefined);
    if (effectiveEnd && effectiveEnd < today) {
      throw new GraphQLError('Cannot activate a study whose end date is already in the past.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: `End date ${effectiveEnd} is in the past. Update the end date before activating.` } },
      });
    }
  }

  if (to === 'Completed') {
    // S5
    if (countStudySites(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned site before it can be Completed.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one site before completing the study.' } },
      });
    }
    // S6
    if (countStudyExaminers(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned examiner before it can be Completed.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner before completing the study.' } },
      });
    }
    // D8
    if (STRICT_STUDY_COMPLETE_REQUIRES_NO_ACTIVE_SITES) {
      const activeSite = findActiveSiteForStudy(existing.id);
      if (activeSite) {
        throw new GraphQLError(`Cannot complete study: site "${activeSite.name}" is still Active.`, {
          extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Site "${activeSite.name}" is still Active. Close or remove it before completing the study.` } },
        });
      }
    }
    // D6
    const endDate = inputDates.endDate || existing.endDate || null;
    if (!endDate) {
      throw new GraphQLError('Study must have an end date before it can be Completed.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: 'End date is required to complete the study.' } },
      });
    }
    if (endDate > today) {
      throw new GraphQLError('End date must not be in the future when completing a study.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: `End date ${endDate} is in the future. A study can only be completed on or after its end date.` } },
      });
    }
    const startDate = inputDates.startDate ?? existing.startDate;
    if (startDate && endDate < startDate) {
      throw new GraphQLError('End date must be on or after start date.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: 'End date must be on or after start date.' } },
      });
    }
  }
}

export function updateStudy(id: number, input: UpdateStudyInput): StudyRow {
  const existing = findStudyById(id);
  if (!existing) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });

  const today = todayUTC();

  // D3
  if (existing.status === 'Planned' && input.startDate !== undefined && input.startDate < today) {
    throw new GraphQLError('Start date cannot be in the past for a Planned study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: 'Start date must be today or in the future.' } },
    });
  }

  if (input.status !== undefined && input.status !== existing.status) {
    enforceStatusTransition(existing, input.status, { startDate: input.startDate, endDate: input.endDate });
  }

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  const invalidKey = fields.find(([k]) => !STUDY_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update study', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  updateStudyById(id, fields);
  return findStudyById(id)!;
}

// ── Site assignment ───────────────────────────────────────────────────────

export function assignSiteToStudy(studyId: number, siteId: number): void {
  if (!findStudyById(studyId)) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });
  const site = findSiteForStudy(siteId);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });
  // SI1: only Active sites
  if (site.status !== 'Active') {
    throw new GraphQLError(`Cannot assign a ${site.status} site to a study. Only Active sites can be assigned.`, {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: `Site is ${site.status}. Only Active sites can be assigned to a study.` } },
    });
  }
  insertStudySite(studyId, siteId);
}

export function unassignSiteFromStudy(studyId: number, siteId: number): void {
  const study = findStudyById(studyId);
  if (!study) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // D9
  if (STRICT_NO_SITE_UNASSIGN_WHEN_STUDY_ACTIVE && study.status === 'Active') {
    throw new GraphQLError('Cannot unassign a site from an Active study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Sites cannot be unassigned while the study is Active.' } },
    });
  }
  // SI2
  if (countSSEForStudySite(studyId, siteId) > 0) {
    throw new GraphQLError(
      'Cannot unassign this site: it has examiner assignments for this study. Remove those first.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Remove per-study examiner assignments for this site before unassigning it.' } } }
    );
  }
  deleteStudySite(studyId, siteId);
}

// ── SSE (study_site_examiners) ────────────────────────────────────────────

export interface SSEExaminer extends ExaminerRow {
  certificate: ExaminerCertificateRow | null;
}

export interface StudySiteWithExaminers {
  site: SiteRow;
  examiners: SSEExaminer[];
  availableExaminers: ExaminerRow[];
}

export function getStudySitesWithStudyExaminers(studyId: number): StudySiteWithExaminers[] {
  const sites = findSitesByStudyId(studyId);
  if (sites.length === 0) return [];

  const siteIds = sites.map((s) => s.id);

  const assignedRows = findSSERowsForStudy(studyId, siteIds);

  const certIds = [...new Set(assignedRows.map((r) => r.certificate_id).filter(Boolean))];
  const certMap = new Map<number, ExaminerCertificateRow>();
  for (const c of findCertsByIds(certIds)) certMap.set(c.id, c);

  const availableRows = findAvailableExaminersForSites(siteIds);

  const assignedBySite = new Map<number, SSEExaminer[]>();
  const availableBySite = new Map<number, ExaminerRow[]>();
  for (const siteId of siteIds) {
    assignedBySite.set(siteId, []);
    availableBySite.set(siteId, []);
  }
  for (const row of assignedRows) {
    const cert = certMap.get(row.certificate_id) ?? null;
    assignedBySite.get(row.site_id)!.push({ ...row, certificate: cert });
  }
  for (const row of availableRows) {
    availableBySite.get(row.site_id)!.push(row);
  }

  return sites.map((site) => ({
    site,
    examiners: assignedBySite.get(site.id) ?? [],
    availableExaminers: availableBySite.get(site.id) ?? [],
  }));
}

export function assignExaminerToStudySite(
  studyId: number,
  siteId: number,
  examinerId: number,
  certificateId?: number
): void {
  // SI5a: site must be assigned to the study
  if (!studySiteExists(studyId, siteId)) {
    throw new GraphQLError('Site is not assigned to this study', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Site is not assigned to this study' } },
    });
  }
  // SI5b: site must not be Closed
  const site = findSiteForStudy(siteId);
  if (site?.status === 'Closed') {
    throw new GraphQLError('Cannot assign an examiner from a Closed site to a study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'This site is Closed. Examiners from Closed sites cannot be assigned to a study.' } },
    });
  }
  // SI5c: examiner must be assigned to the site
  if (!siteExaminerExists(siteId, examinerId)) {
    throw new GraphQLError('Examiner is not assigned to this site', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Examiner is not assigned to this site' } },
    });
  }

  const today = todayUTC();
  let resolvedCertId: number;

  if (certificateId) {
    // SI7: explicit cert — validate ownership + expiry
    const cert = getCertificateById(certificateId);
    if (!cert || cert.examiner_id !== examinerId) {
      throw new GraphQLError('Certificate does not belong to this examiner.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { certificateId: 'Certificate does not belong to this examiner.' } },
      });
    }
    if (cert.expiresOn < today) {
      throw new GraphQLError('Selected certificate is expired.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { certificateId: 'This certificate has expired. Choose a valid one.' } },
      });
    }
    resolvedCertId = cert.id;
  } else {
    // SI7: auto-select latest valid cert
    const validCerts = getCertificatesByExaminer(examinerId).filter((c) => c.expiresOn >= today);
    if (validCerts.length === 0) {
      throw new GraphQLError('Examiner has no valid certificate (expired or missing).', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Examiner has no valid certificate. Add or renew a certificate before assigning.' } },
      });
    }
    resolvedCertId = validCerts[0].id;
  }

  insertSSE(studyId, siteId, examinerId, resolvedCertId);
}

export function unassignExaminerFromStudySite(studyId: number, siteId: number, examinerId: number): void {
  deleteSSE(studyId, siteId, examinerId);
}
