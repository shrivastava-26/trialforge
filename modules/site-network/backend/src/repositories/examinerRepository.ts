import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { ExaminerRow, StudyRow, SiteRow } from '../types';

export function findExaminerById(id: number): ExaminerRow | null {
  return queryOne<ExaminerRow>('SELECT * FROM examiners WHERE id = ?', [id]) ?? null;
}

export function findExaminersPaged(pageSize: number, offset: number): { rows: ExaminerRow[]; total: number } {
  const rows = queryAll<ExaminerRow>('SELECT * FROM examiners ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM examiners') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function findStudiesByExaminerId(examinerId: number): StudyRow[] {
  return queryAll<StudyRow>(
    `SELECT DISTINCT s.* FROM studies s
     JOIN study_sites ss ON ss.study_id = s.id
     JOIN site_examiners se ON se.site_id = ss.site_id
     WHERE se.examiner_id = ? ORDER BY s.id ASC`,
    [examinerId]
  );
}

export function findSitesByExaminerId(examinerId: number): SiteRow[] {
  return queryAll<SiteRow>(
    `SELECT si.* FROM sites si JOIN site_examiners se ON se.site_id = si.id WHERE se.examiner_id = ? ORDER BY si.id ASC`,
    [examinerId]
  );
}

export function examinerCodeExists(examinerCode: string): boolean {
  return !!queryOne('SELECT id FROM examiners WHERE examinerCode = ?', [examinerCode]);
}

export function insertExaminer(
  examinerCode: string,
  name: string,
  specialty: string,
  email: string,
  role: string,
  status: string
): number {
  const result = getDb()
    .prepare('INSERT INTO examiners (examinerCode, name, specialty, email, role, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(examinerCode, name, specialty, email, role, status);
  return result.lastInsertRowid as number;
}

export function updateExaminerById(id: number, fields: Array<[string, unknown]>): void {
  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE examiners SET ${setClauses} WHERE id = ?`).run(...values, id);
}

// Used by DataLoader: batch-fetch examiners by IDs
export function findExaminersByIds(ids: readonly number[]): ExaminerRow[] {
  if (ids.length === 0) return [];
  const ph = ids.map(() => '?').join(',');
  return queryAll<ExaminerRow>(`SELECT * FROM examiners WHERE id IN (${ph})`, [...ids]);
}
