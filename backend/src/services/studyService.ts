import { GraphQLError } from 'graphql';
import { queryOne, queryAll } from '../db/query';
import { getDb } from '../db/connection';
import { StudyRow, SiteRow, ExaminerRow } from '../types';

// ── Policy flags ─────────────────────────────────────────────────────────
// D8: When true, transitioning Active → Completed is rejected if any assigned
//     site still has status 'Active'. Set false to allow completing with active sites.
const STRICT_STUDY_COMPLETE_REQUIRES_NO_ACTIVE_SITES = true;

// D9: When true, unassigning a site from an Active study is rejected.
//     Set false to allow it (existing SSE integrity checks still apply).
const STRICT_NO_SITE_UNASSIGN_WHEN_STUDY_ACTIVE = true;

// ── Date helpers ─────────────────────────────────────────────────────────
/** Returns today's date in UTC as 'YYYY-MM-DD'. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getStudiesPaged(page: number, pageSize: number): { rows: StudyRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = queryAll<StudyRow>('SELECT * FROM studies ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM studies') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function getStudyById(id: number): StudyRow | null {
  return queryOne<StudyRow>('SELECT * FROM studies WHERE id = ?', [id]) ?? null;
}

export function getSitesByStudy(studyId: number): SiteRow[] {
  return queryAll<SiteRow>(
    `SELECT si.* FROM sites si JOIN study_sites ss ON ss.site_id = si.id WHERE ss.study_id = ? ORDER BY si.id ASC`,
    [studyId]
  );
}

export function getExaminersByStudy(studyId: number): ExaminerRow[] {
  // Returns the union of examiners assigned via study_site_examiners across all sites.
  // Falls back to the old site_examiners join if no SSE rows exist yet (migration compat).
  const sseRows = queryAll<ExaminerRow>(
    `SELECT DISTINCT e.* FROM examiners e
     JOIN study_site_examiners sse ON sse.examiner_id = e.id
     WHERE sse.study_id = ? ORDER BY e.id ASC`,
    [studyId]
  );
  if (sseRows.length > 0) return sseRows;
  // Legacy fallback: derive from site_examiners (pre-SSE data)
  return queryAll<ExaminerRow>(
    `SELECT DISTINCT e.* FROM examiners e
     JOIN site_examiners se ON se.examiner_id = e.id
     JOIN study_sites ss ON ss.site_id = se.site_id
     WHERE ss.study_id = ? ORDER BY e.id ASC`,
    [studyId]
  );
}

export interface CreateStudyInput {
  protocolId: string;
  title: string;
  sponsor: string;
  phase: string;
  startDate: string;
  endDate?: string;   // optional on create (lenient rule)
  description?: string;
  // status is intentionally absent — createStudy always sets 'Planned'
}

export function createStudy(input: CreateStudyInput): StudyRow {
  const today = todayUTC();

  // D1: startDate must be >= today
  if (input.startDate < today) {
    throw new GraphQLError('Start date cannot be in the past.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: 'Start date must be today or in the future.' } },
    });
  }
  // D2: if endDate provided, must be >= startDate
  if (input.endDate && input.endDate < input.startDate) {
    throw new GraphQLError('End date must be on or after start date.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: 'End date must be on or after start date.' } },
    });
  }

  // protocolId is already normalized (trimmed + uppercased) by Zod schema
  const existing = queryOne('SELECT id FROM studies WHERE protocolId = ?', [input.protocolId]);
  if (existing) {
    throw new GraphQLError('Protocol ID already exists', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { protocolId: 'Protocol ID must be unique' } },
    });
  }
  const db = getDb();
  try {
    // S1: status is always 'Planned' on creation — not caller-controlled
    const result = db.prepare(
      `INSERT INTO studies (protocolId,title,sponsor,phase,startDate,endDate,status,description)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(input.protocolId, input.title, input.sponsor, input.phase, input.startDate, input.endDate ?? '', 'Planned', input.description ?? '');
    return getStudyById(result.lastInsertRowid as number)!;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed: studies.protocolId')) {
      throw new GraphQLError('Protocol ID already exists', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { protocolId: 'Protocol ID must be unique' } },
      });
    }
    throw new GraphQLError('Failed to create study', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }
}

export interface UpdateStudyInput {
  title?: string;
  sponsor?: string;
  phase?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  description?: string;
}

// ── Status transition helpers ─────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { Planned: 0, Active: 1, Completed: 2 };

function countStudySites(studyId: number): number {
  return (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM study_sites WHERE study_id = ?', [studyId]) ?? { cnt: 0 }).cnt;
}

function countStudyExaminers(studyId: number): number {
  // Prefer SSE count; fall back to site_examiners join for legacy data
  const sseCount = (queryOne<{ cnt: number }>(
    'SELECT COUNT(DISTINCT examiner_id) as cnt FROM study_site_examiners WHERE study_id = ?',
    [studyId]
  ) ?? { cnt: 0 }).cnt;
  if (sseCount > 0) return sseCount;
  return (queryOne<{ cnt: number }>(
    `SELECT COUNT(DISTINCT se.examiner_id) as cnt
     FROM site_examiners se JOIN study_sites ss ON ss.site_id = se.site_id
     WHERE ss.study_id = ?`,
    [studyId]
  ) ?? { cnt: 0 }).cnt;
}

function enforceStatusTransition(existing: StudyRow, newStatus: string, inputDates: { startDate?: string; endDate?: string }): void {
  const from = existing.status;
  const to = newStatus;
  if (from === to) return; // no-op

  const today = todayUTC();
  const fromOrder = STATUS_ORDER[from] ?? -1;
  const toOrder = STATUS_ORDER[to] ?? -1;

  // S2: forward-only, no skipping
  if (toOrder !== fromOrder + 1) {
    const allowed = from === 'Planned' ? 'Active' : from === 'Active' ? 'Completed' : 'none';
    throw new GraphQLError(
      `Invalid status transition: ${from} → ${to}. Allowed next status: ${allowed}.`,
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Cannot transition from ${from} to ${to}. Allowed: ${allowed}.` } } }
    );
  }

  // S3 + S4 + D4 + D5 + D7: Planned → Active
  if (to === 'Active') {
    if (countStudySites(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned site before it can be set to Active.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one site before activating the study.' } },
      });
    }
    if (countStudyExaminers(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned examiner before it can be set to Active.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner to a study site before activating.' } },
      });
    }
    // D7: no Closed sites
    const closedSite = queryOne<{ name: string }>(
      `SELECT si.name FROM sites si JOIN study_sites ss ON ss.site_id = si.id
       WHERE ss.study_id = ? AND si.status = 'Closed' LIMIT 1`,
      [existing.id]
    );
    if (closedSite) {
      throw new GraphQLError(`Cannot activate study: site "${closedSite.name}" is Closed. Remove or reopen it first.`, {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Site "${closedSite.name}" is Closed. Remove or reopen it before activating.` } },
      });
    }
    // D4: effective startDate must be <= today
    const effectiveStart = inputDates.startDate ?? existing.startDate;
    if (effectiveStart && effectiveStart > today) {
      throw new GraphQLError('Cannot activate a study with a future start date.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: `Start date ${effectiveStart} is in the future. A study can only be activated on or after its start date.` } },
      });
    }
    // D5: effective endDate (if present) must be >= today
    const effectiveEnd = inputDates.endDate ?? (existing.endDate || undefined);
    if (effectiveEnd && effectiveEnd < today) {
      throw new GraphQLError('Cannot activate a study whose end date is already in the past.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { endDate: `End date ${effectiveEnd} is in the past. Update the end date before activating.` } },
      });
    }
  }

  // S5 + S6 + S7 + D6 + D8: Active → Completed
  if (to === 'Completed') {
    if (countStudySites(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned site before it can be Completed.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one site before completing the study.' } },
      });
    }
    if (countStudyExaminers(existing.id) === 0) {
      throw new GraphQLError('Study must have at least one assigned examiner before it can be Completed.', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner before completing the study.' } },
      });
    }
    // D8 (configurable): reject if any assigned site is still Active
    if (STRICT_STUDY_COMPLETE_REQUIRES_NO_ACTIVE_SITES) {
      const activeSite = queryOne<{ name: string }>(
        `SELECT si.name FROM sites si JOIN study_sites ss ON ss.site_id = si.id
         WHERE ss.study_id = ? AND si.status = 'Active' LIMIT 1`,
        [existing.id]
      );
      if (activeSite) {
        throw new GraphQLError(`Cannot complete study: site "${activeSite.name}" is still Active.`, {
          extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: `Site "${activeSite.name}" is still Active. Close or remove it before completing the study.` } },
        });
      }
    }
    // D6: endDate required, <= today, >= startDate
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

// Permitted column names for dynamic UPDATE — prevents unexpected keys reaching SQL
const STUDY_UPDATE_COLUMNS = new Set(['title', 'sponsor', 'phase', 'startDate', 'endDate', 'status', 'description']);

export function updateStudy(id: number, input: UpdateStudyInput): StudyRow {
  const existing = getStudyById(id);
  if (!existing) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });

  const today = todayUTC();

  // D3: when study is Planned and startDate is being updated, it must be >= today
  if (existing.status === 'Planned' && input.startDate !== undefined && input.startDate < today) {
    throw new GraphQLError('Start date cannot be in the past for a Planned study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { startDate: 'Start date must be today or in the future.' } },
    });
  }

  // S2–S7 + D4–D8: enforce status transition rules before any DB write
  if (input.status !== undefined && input.status !== existing.status) {
    enforceStatusTransition(existing, input.status, { startDate: input.startDate, endDate: input.endDate });
  }

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  // Safety: only allow known columns in the SET clause
  const invalidKey = fields.find(([k]) => !STUDY_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update study', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE studies SET ${setClauses} WHERE id = ?`).run(...values, id);
  return getStudyById(id)!;
}

export function assignSiteToStudy(studyId: number, siteId: number): void {
  if (!getStudyById(studyId)) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });
  const site = queryOne<SiteRow>('SELECT * FROM sites WHERE id = ?', [siteId]);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });
  // SI1: cannot assign a Closed site to a study
  if (site.status === 'Closed') {
    throw new GraphQLError('Cannot assign a Closed site to a study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Site is Closed and cannot be assigned to a study.' } },
    });
  }
  getDb().prepare('INSERT OR IGNORE INTO study_sites (study_id, site_id) VALUES (?, ?)').run(studyId, siteId);
}

// ── study_site_examiners (3-way junction) ────────────────────────────────

export function unassignSiteFromStudy(studyId: number, siteId: number): void {
  const study = getStudyById(studyId);
  if (!study) throw new GraphQLError('Study not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // D9 (configurable): block unassign when study is Active
  if (STRICT_NO_SITE_UNASSIGN_WHEN_STUDY_ACTIVE && study.status === 'Active') {
    throw new GraphQLError('Cannot unassign a site from an Active study.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Sites cannot be unassigned while the study is Active.' } },
    });
  }

  // SI2: block unassign if SSE rows exist for this study+site pair to prevent silent data loss
  const sseCount = (queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM study_site_examiners WHERE study_id = ? AND site_id = ?',
    [studyId, siteId]
  ) ?? { cnt: 0 }).cnt;
  if (sseCount > 0) {
    throw new GraphQLError(
      'Cannot unassign this site: it has examiner assignments for this study. Remove those first.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Remove per-study examiner assignments for this site before unassigning it.' } } }
    );
  }
  getDb().prepare('DELETE FROM study_sites WHERE study_id = ? AND site_id = ?').run(studyId, siteId);
}

export interface StudySiteWithExaminers {
  site: SiteRow;
  examiners: ExaminerRow[];       // assigned to this study at this site
  availableExaminers: ExaminerRow[]; // all examiners assigned to this site
}

/**
 * Returns every site assigned to the study, each decorated with:
 *   - examiners: those assigned via study_site_examiners for this study+site
 *   - availableExaminers: all examiners on the site (site_examiners)
 * Uses two bulk queries + in-memory grouping to avoid N+1.
 */
export function getStudySitesWithStudyExaminers(studyId: number): StudySiteWithExaminers[] {
  const sites = getSitesByStudy(studyId);
  if (sites.length === 0) return [];

  const siteIds = sites.map((s) => s.id);
  const placeholders = siteIds.map(() => '?').join(',');

  // All examiners assigned to this study at any of its sites
  type SSERow = ExaminerRow & { site_id: number };
  const assignedRows = queryAll<SSERow>(
    `SELECT e.*, sse.site_id FROM examiners e
     JOIN study_site_examiners sse ON sse.examiner_id = e.id
     WHERE sse.study_id = ? AND sse.site_id IN (${placeholders})
     ORDER BY e.id ASC`,
    [studyId, ...siteIds]
  );

  // All examiners available at any of the study's sites
  type SERow = ExaminerRow & { site_id: number };
  const availableRows = queryAll<SERow>(
    `SELECT e.*, se.site_id FROM examiners e
     JOIN site_examiners se ON se.examiner_id = e.id
     WHERE se.site_id IN (${placeholders})
     ORDER BY e.id ASC`,
    siteIds
  );

  // Group in memory
  const assignedBySite = new Map<number, ExaminerRow[]>();
  const availableBySite = new Map<number, ExaminerRow[]>();
  for (const siteId of siteIds) {
    assignedBySite.set(siteId, []);
    availableBySite.set(siteId, []);
  }
  for (const row of assignedRows) {
    assignedBySite.get(row.site_id)!.push(row);
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
  examinerId: number
): void {
  // Rule (a): site must be assigned to the study
  if (!queryOne('SELECT 1 FROM study_sites WHERE study_id = ? AND site_id = ?', [studyId, siteId])) {
    throw new GraphQLError('Site is not assigned to this study', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Site is not assigned to this study' } },
    });
  }
  // Rule (b): examiner must be assigned to the site
  if (!queryOne('SELECT 1 FROM site_examiners WHERE site_id = ? AND examiner_id = ?', [siteId, examinerId])) {
    throw new GraphQLError('Examiner is not assigned to this site', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Examiner is not assigned to this site' } },
    });
  }
  getDb()
    .prepare('INSERT OR IGNORE INTO study_site_examiners (study_id, site_id, examiner_id) VALUES (?, ?, ?)')
    .run(studyId, siteId, examinerId);
}

export function unassignExaminerFromStudySite(
  studyId: number,
  siteId: number,
  examinerId: number
): void {
  getDb()
    .prepare('DELETE FROM study_site_examiners WHERE study_id = ? AND site_id = ? AND examiner_id = ?')
    .run(studyId, siteId, examinerId);
}
