import { queryAll, queryOne, execute } from '../db/query';
import { TfPatientRow, PatientStatus } from '../types';

export function findById(id: number): TfPatientRow | undefined {
  return queryOne<TfPatientRow>('SELECT * FROM tf_patients WHERE id = ?', [id]);
}

export function findBySubjectId(subjectId: string): TfPatientRow | undefined {
  return queryOne<TfPatientRow>('SELECT * FROM tf_patients WHERE subject_id = ?', [subjectId]);
}

export function findAll(
  page: number,
  pageSize: number,
  filters?: { status?: PatientStatus }
): { rows: TfPatientRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.status) {
    where += ' AND status = ?';
    params.push(filters.status);
  }

  const countRow = queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM tf_patients ${where}`, params);
  const rows = queryAll<TfPatientRow>(
    `SELECT * FROM tf_patients ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function insert(subjectId: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_patients (subject_id) VALUES (?)',
    [subjectId]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: PatientStatus): void {
  execute(
    "UPDATE tf_patients SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id]
  );
}

export function updateSubjectId(id: number, subjectId: string): void {
  execute(
    "UPDATE tf_patients SET subject_id = ?, updated_at = datetime('now') WHERE id = ?",
    [subjectId, id]
  );
}
