import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { StudyRow, SiteRow, ExaminerRow, ExaminerCertificateRow } from '../types';

export function findStudyById(id: number): StudyRow | null {
  return queryOne<StudyRow>('SELECT * FROM studies WHERE id = ?', [id]) ?? null;
}

export function findStudiesPaged(pageSize: number, offset: number): { rows: StudyRow[]; total: number } {
  const rows = queryAll<StudyRow>('SELECT * FROM studies ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM studies') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function findSitesByStudyId(studyId: number): SiteRow[] {
  return queryAll<SiteRow>(
    `SELECT si.* FROM sites si JOIN study_sites ss ON ss.site_id = si.id WHERE ss.study_id = ? ORDER BY si.id ASC`,
    [studyId]
  );
}

export function findExaminersByStudyId(studyId: number): ExaminerRow[] {
  const sseRows = queryAll<ExaminerRow>(
    `SELECT DISTINCT e.* FROM examiners e
     JOIN study_site_examiners sse ON sse.examiner_id = e.id
     WHERE sse.study_id = ? ORDER BY e.id ASC`,
    [studyId]
  );
  if (sseRows.length > 0) return sseRows;
  // Legacy fallback for pre-SSE data
  return queryAll<ExaminerRow>(
    `SELECT DISTINCT e.* FROM examiners e
     JOIN site_examiners se ON se.examiner_id = e.id
     JOIN study_sites ss ON ss.site_id = se.site_id
     WHERE ss.study_id = ? ORDER BY e.id ASC`,
    [studyId]
  );
}

export function countStudySites(studyId: number): number {
  return (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM study_sites WHERE study_id = ?', [studyId]) ?? { cnt: 0 }).cnt;
}

export function countStudyExaminers(studyId: number): number {
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

export function findClosedSiteForStudy(studyId: number): { name: string } | null {
  return queryOne<{ name: string }>(
    `SELECT si.name FROM sites si JOIN study_sites ss ON ss.site_id = si.id
     WHERE ss.study_id = ? AND si.status = 'Closed' LIMIT 1`,
    [studyId]
  ) ?? null;
}

export function findActiveSiteForStudy(studyId: number): { name: string } | null {
  return queryOne<{ name: string }>(
    `SELECT si.name FROM sites si JOIN study_sites ss ON ss.site_id = si.id
     WHERE ss.study_id = ? AND si.status = 'Active' LIMIT 1`,
    [studyId]
  ) ?? null;
}

export function protocolIdExists(protocolId: string): boolean {
  return !!queryOne('SELECT id FROM studies WHERE protocolId = ?', [protocolId]);
}

export function insertStudy(
  protocolId: string, title: string, sponsor: string, phase: string,
  startDate: string, endDate: string, description: string
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO studies (protocolId,title,sponsor,phase,startDate,endDate,status,description)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(protocolId, title, sponsor, phase, startDate, endDate, 'Planned', description);
  return result.lastInsertRowid as number;
}

export function updateStudyById(id: number, fields: Array<[string, unknown]>): void {
  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE studies SET ${setClauses} WHERE id = ?`).run(...values, id);
}

export function findSiteForStudy(siteId: number): SiteRow | null {
  return queryOne<SiteRow>('SELECT * FROM sites WHERE id = ?', [siteId]) ?? null;
}

export function insertStudySite(studyId: number, siteId: number): void {
  getDb().prepare('INSERT OR IGNORE INTO study_sites (study_id, site_id) VALUES (?, ?)').run(studyId, siteId);
}

export function deleteStudySite(studyId: number, siteId: number): void {
  getDb().prepare('DELETE FROM study_sites WHERE study_id = ? AND site_id = ?').run(studyId, siteId);
}

export function studySiteExists(studyId: number, siteId: number): boolean {
  return !!queryOne('SELECT 1 FROM study_sites WHERE study_id = ? AND site_id = ?', [studyId, siteId]);
}

export function countSSEForStudySite(studyId: number, siteId: number): number {
  return (queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM study_site_examiners WHERE study_id = ? AND site_id = ?',
    [studyId, siteId]
  ) ?? { cnt: 0 }).cnt;
}

export function siteExaminerExists(siteId: number, examinerId: number): boolean {
  return !!queryOne('SELECT 1 FROM site_examiners WHERE site_id = ? AND examiner_id = ?', [siteId, examinerId]);
}

export function insertSSE(studyId: number, siteId: number, examinerId: number, certificateId: number): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO study_site_examiners (study_id, site_id, examiner_id, certificate_id) VALUES (?, ?, ?, ?)')
    .run(studyId, siteId, examinerId, certificateId);
}

export function deleteSSE(studyId: number, siteId: number, examinerId: number): void {
  getDb()
    .prepare('DELETE FROM study_site_examiners WHERE study_id = ? AND site_id = ? AND examiner_id = ?')
    .run(studyId, siteId, examinerId);
}

// Bulk SSE query used by getStudySitesWithStudyExaminers — already optimal, kept as-is
export type SSERow = ExaminerRow & { site_id: number; certificate_id: number };
export type SERow = ExaminerRow & { site_id: number };

export function findSSERowsForStudy(studyId: number, siteIds: number[]): SSERow[] {
  const ph = siteIds.map(() => '?').join(',');
  return queryAll<SSERow>(
    `SELECT e.*, sse.site_id, sse.certificate_id FROM examiners e
     JOIN study_site_examiners sse ON sse.examiner_id = e.id
     WHERE sse.study_id = ? AND sse.site_id IN (${ph})
     ORDER BY e.id ASC`,
    [studyId, ...siteIds]
  );
}

export function findCertsByIds(certIds: number[]): ExaminerCertificateRow[] {
  if (certIds.length === 0) return [];
  const ph = certIds.map(() => '?').join(',');
  return queryAll<ExaminerCertificateRow>(
    `SELECT * FROM examiner_certificates WHERE id IN (${ph})`,
    certIds
  );
}

export function findAvailableExaminersForSites(siteIds: number[]): SERow[] {
  const ph = siteIds.map(() => '?').join(',');
  return queryAll<SERow>(
    `SELECT e.*, se.site_id FROM examiners e
     JOIN site_examiners se ON se.examiner_id = e.id
     WHERE se.site_id IN (${ph})
     ORDER BY e.id ASC`,
    siteIds
  );
}

// Used by DataLoader: batch-fetch studies by IDs
export function findStudiesByIds(ids: readonly number[]): StudyRow[] {
  if (ids.length === 0) return [];
  const ph = ids.map(() => '?').join(',');
  return queryAll<StudyRow>(`SELECT * FROM studies WHERE id IN (${ph})`, [...ids]);
}
