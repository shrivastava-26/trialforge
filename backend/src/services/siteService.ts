import { GraphQLError } from 'graphql';
import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { SiteRow, StudyRow, ExaminerRow } from '../types';

export function getSitesPaged(page: number, pageSize: number): { rows: SiteRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = queryAll<SiteRow>('SELECT * FROM sites ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM sites') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function getSiteById(id: number): SiteRow | null {
  return queryOne<SiteRow>('SELECT * FROM sites WHERE id = ?', [id]) ?? null;
}

export function getStudiesBySite(siteId: number): StudyRow[] {
  return queryAll<StudyRow>(
    `SELECT s.* FROM studies s JOIN study_sites ss ON ss.study_id = s.id WHERE ss.site_id = ? ORDER BY s.id ASC`,
    [siteId]
  );
}

export function getExaminersBySite(siteId: number): ExaminerRow[] {
  return queryAll<ExaminerRow>(
    `SELECT e.* FROM examiners e JOIN site_examiners se ON se.examiner_id = e.id WHERE se.site_id = ? ORDER BY e.id ASC`,
    [siteId]
  );
}

function countExaminersForSite(siteId: number): number {
  const row = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM site_examiners WHERE site_id = ?', [siteId]);
  return row?.cnt ?? 0;
}

export interface CreateSiteInput {
  siteCode: string;
  name: string;
  city: string;
  country: string;
  // status intentionally absent — createSite always sets 'Planned'
}

export function createSite(input: CreateSiteInput): SiteRow {
  if (queryOne('SELECT id FROM sites WHERE siteCode = ?', [input.siteCode])) {
    throw new GraphQLError(`Site code ${input.siteCode} already exists`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  // P1 enforcement: status is always 'Planned' on creation — cannot be Active without examiners
  const result = getDb().prepare(
    `INSERT INTO sites (siteCode, name, city, country, status) VALUES (?, ?, ?, ?, ?)`
  ).run(input.siteCode, input.name, input.city, input.country, 'Planned');
  return getSiteById(result.lastInsertRowid as number)!;
}

export interface UpdateSiteInput {
  name?: string;
  city?: string;
  country?: string;
  status?: string;
}

// Permitted column names for dynamic UPDATE
const SITE_UPDATE_COLUMNS = new Set(['name', 'city', 'country', 'status']);

export function updateSite(id: number, input: UpdateSiteInput): SiteRow {
  const existing = getSiteById(id);
  if (!existing) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // Domain rule: cannot set Active unless site has at least one examiner
  if (input.status === 'Active' && countExaminersForSite(id) === 0) {
    throw new GraphQLError(
      'A site must have at least one assigned examiner before it can be set to Active.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { status: 'Assign at least one examiner before setting the site to Active.' } } }
    );
  }

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  // Safety: only allow known columns in the SET clause
  const invalidKey = fields.find(([k]) => !SITE_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update site', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE sites SET ${setClauses} WHERE id = ?`).run(...values, id);
  return getSiteById(id)!;
}

export function assignExaminerToSite(siteId: number, examinerId: number): void {
  const site = getSiteById(siteId);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });
  // SI3: cannot assign an examiner to a Closed site
  if (site.status === 'Closed') {
    throw new GraphQLError('Cannot assign an examiner to a Closed site.', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { siteId: 'Site is Closed. Reopen it before assigning examiners.' } },
    });
  }
  if (!queryOne('SELECT id FROM examiners WHERE id = ?', [examinerId])) throw new GraphQLError('Examiner not found', { extensions: { code: 'BAD_USER_INPUT' } });
  getDb().prepare('INSERT OR IGNORE INTO site_examiners (site_id, examiner_id) VALUES (?, ?)').run(siteId, examinerId);
}

export function unassignExaminerFromSite(siteId: number, examinerId: number): void {
  const site = getSiteById(siteId);
  if (!site) throw new GraphQLError('Site not found', { extensions: { code: 'BAD_USER_INPUT' } });

  // SI4: block if this examiner is referenced in study_site_examiners for this site
  const sseCount = (queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM study_site_examiners WHERE site_id = ? AND examiner_id = ?',
    [siteId, examinerId]
  ) ?? { cnt: 0 }).cnt;
  if (sseCount > 0) {
    throw new GraphQLError(
      'Cannot unassign this examiner: they are assigned to one or more studies at this site. Remove those study assignments first.',
      { extensions: { code: 'BAD_USER_INPUT', fieldErrors: { examinerId: 'Remove per-study assignments for this examiner at this site before unassigning.' } } }
    );
  }

  // Domain rule: if site is Active and this is the last examiner, auto-downgrade to Planned
  const countAfter = countExaminersForSite(siteId) - 1;
  if (site.status === 'Active' && countAfter === 0) {
    getDb().prepare(`UPDATE sites SET status = 'Planned' WHERE id = ?`).run(siteId);
  }

  getDb().prepare('DELETE FROM site_examiners WHERE site_id = ? AND examiner_id = ?').run(siteId, examinerId);
}
