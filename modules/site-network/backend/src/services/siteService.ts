import { GraphQLError } from 'graphql';
import { SiteRow, StudyRow, ExaminerRow } from '../types';
import {
  findSiteById, findSitesPaged, findStudiesBySiteId, findExaminersBySiteId,
  countExaminersForSite, siteCodeExists, insertSite, updateSiteById,
  downgradeSiteToPlanned, insertSiteExaminer, deleteSiteExaminer, countSSEForSiteExaminer,
} from '../repositories/siteRepository';
import { hasValidCertificate } from './examinerService';
import { findExaminerById } from '../repositories/examinerRepository';

export function getSitesPaged(page: number, pageSize: number): { rows: SiteRow[]; total: number } {
  return findSitesPaged(pageSize, (page - 1) * pageSize);
}

export function getSiteById(id: number): SiteRow | null {
  return findSiteById(id);
}

export function getStudiesBySite(siteId: number): StudyRow[] {
  return findStudiesBySiteId(siteId);
}

export function getExaminersBySite(siteId: number): ExaminerRow[] {
  return findExaminersBySiteId(siteId);
}

export interface CreateSiteInput {
  siteCode: string;
  name: string;
  city: string;
  country: string;
}

export function createSite(input: CreateSiteInput): SiteRow {
  if (siteCodeExists(input.siteCode)) {
    throw new GraphQLError(`Site code ${input.siteCode} already exists`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const id = insertSite(input.siteCode, input.name, input.city, input.country);
  return findSiteById(id)!;
}

export interface UpdateSiteInput {
  name?: string;
  city?: string;
  country?: string;
  status?: string;
}

const SITE_UPDATE_COLUMNS = new Set(['name', 'city', 'country', 'status']);

export function updateSite(id: number, input: UpdateSiteInput): SiteRow {
  const existing = findSiteById(id);
  if (!existing) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // P1: cannot set Active unless site has at least one examiner
  if (input.status === 'Active' && countExaminersForSite(id) === 0) {
    throw new GraphQLError(
      'A site must have at least one assigned examiner before it can be set to Active.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner before setting the site to Active.' } } }
    );
  }

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  const invalidKey = fields.find(([k]) => !SITE_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update site', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  updateSiteById(id, fields);
  return findSiteById(id)!;
}

export function assignExaminerToSite(siteId: number, examinerId: number): void {
  const site = findSiteById(siteId);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // SI3: cannot assign to a Closed site
  if (site.status === 'Closed') {
    throw new GraphQLError('Cannot assign an examiner to a Closed site.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Site is Closed. Reopen it before assigning examiners.' } },
    });
  }
  if (!findExaminerById(examinerId)) throw new GraphQLError('Examiner not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // SI6: examiner must have a valid certificate
  if (!hasValidCertificate(examinerId)) {
    throw new GraphQLError('Examiner has no valid certificate (expired or missing).', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Examiner has no valid certificate (expired or missing). Add or renew a certificate before assigning.' } },
    });
  }
  insertSiteExaminer(siteId, examinerId);
}

export function unassignExaminerFromSite(siteId: number, examinerId: number): void {
  const site = findSiteById(siteId);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // SI4: block if examiner is referenced in SSE for this site
  if (countSSEForSiteExaminer(siteId, examinerId) > 0) {
    throw new GraphQLError(
      'Cannot unassign this examiner: they are assigned to one or more studies at this site. Remove those study assignments first.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Remove per-study assignments for this examiner at this site before unassigning.' } } }
    );
  }

  // P2: if site is Active and this is the last examiner, auto-downgrade to Planned
  if (site.status === 'Active' && countExaminersForSite(siteId) - 1 === 0) {
    downgradeSiteToPlanned(siteId);
  }

  deleteSiteExaminer(siteId, examinerId);
}
