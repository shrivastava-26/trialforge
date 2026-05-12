import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { SiteRow, StudyRow, ExaminerRow } from '../types';

export function findSiteById(id: number): SiteRow | null {
  return queryOne<SiteRow>('SELECT * FROM sites WHERE id = ?', [id]) ?? null;
}

export function findSitesPaged(pageSize: number, offset: number): { rows: SiteRow[]; total: number } {
  const rows = queryAll<SiteRow>('SELECT * FROM sites ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM sites') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function findStudiesBySiteId(siteId: number): StudyRow[] {
  return queryAll<StudyRow>(
    `SELECT s.* FROM studies s JOIN study_sites ss ON ss.study_id = s.id WHERE ss.site_id = ? ORDER BY s.id ASC`,
    [siteId]
  );
}

export function findExaminersBySiteId(siteId: number): ExaminerRow[] {
  return queryAll<ExaminerRow>(
    `SELECT e.* FROM examiners e JOIN site_examiners se ON se.examiner_id = e.id WHERE se.site_id = ? ORDER BY e.id ASC`,
    [siteId]
  );
}

export function countExaminersForSite(siteId: number): number {
  return (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM site_examiners WHERE site_id = ?', [siteId]) ?? { cnt: 0 }).cnt;
}

export function siteCodeExists(siteCode: string): boolean {
  return !!queryOne('SELECT id FROM sites WHERE siteCode = ?', [siteCode]);
}

export function insertSite(siteCode: string, name: string, city: string, country: string): number {
  const result = getDb()
    .prepare('INSERT INTO sites (siteCode, name, city, country, status) VALUES (?, ?, ?, ?, ?)')
    .run(siteCode, name, city, country, 'Planned');
  return result.lastInsertRowid as number;
}

export function updateSiteById(id: number, fields: Array<[string, unknown]>): void {
  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE sites SET ${setClauses} WHERE id = ?`).run(...values, id);
}

export function downgradeSiteToPlanned(id: number): void {
  getDb().prepare(`UPDATE sites SET status = 'Planned' WHERE id = ?`).run(id);
}

export function insertSiteExaminer(siteId: number, examinerId: number): void {
  getDb().prepare('INSERT OR IGNORE INTO site_examiners (site_id, examiner_id) VALUES (?, ?)').run(siteId, examinerId);
}

export function deleteSiteExaminer(siteId: number, examinerId: number): void {
  getDb().prepare('DELETE FROM site_examiners WHERE site_id = ? AND examiner_id = ?').run(siteId, examinerId);
}

export function countSSEForSiteExaminer(siteId: number, examinerId: number): number {
  return (
    queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM study_site_examiners WHERE site_id = ? AND examiner_id = ?',
      [siteId, examinerId]
    ) ?? { cnt: 0 }
  ).cnt;
}

// Used by DataLoader: batch-fetch sites by IDs
export function findSitesByIds(ids: readonly number[]): SiteRow[] {
  if (ids.length === 0) return [];
  const ph = ids.map(() => '?').join(',');
  return queryAll<SiteRow>(`SELECT * FROM sites WHERE id IN (${ph})`, [...ids]);
}
