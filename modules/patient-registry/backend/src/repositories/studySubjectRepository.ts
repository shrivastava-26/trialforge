import { queryAll, queryOne, execute } from '../db/query';
import { TfStudySubjectRow, PatientStatus } from '../types';

export function findById(id: number): TfStudySubjectRow | undefined {
  return queryOne<TfStudySubjectRow>('SELECT * FROM tf_study_subjects WHERE id = ?', [id]);
}

export function findByPatientId(patientId: number): TfStudySubjectRow[] {
  return queryAll<TfStudySubjectRow>(
    'SELECT * FROM tf_study_subjects WHERE patient_id = ? ORDER BY assigned_at DESC',
    [patientId]
  );
}

export function findByStudySite(
  studyId: string,
  siteId: string | undefined,
  page: number,
  pageSize: number
): { rows: TfStudySubjectRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  let where = 'WHERE study_id = ?';
  const params: unknown[] = [studyId];

  if (siteId) {
    where += ' AND site_id = ?';
    params.push(siteId);
  }

  const countRow = queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM tf_study_subjects ${where}`,
    params
  );
  const rows = queryAll<TfStudySubjectRow>(
    `SELECT * FROM tf_study_subjects ${where} ORDER BY assigned_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findBySite(
  siteId: string,
  page: number,
  pageSize: number
): { rows: TfStudySubjectRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tf_study_subjects WHERE site_id = ?',
    [siteId]
  );
  const rows = queryAll<TfStudySubjectRow>(
    'SELECT * FROM tf_study_subjects WHERE site_id = ? ORDER BY assigned_at DESC LIMIT ? OFFSET ?',
    [siteId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findExisting(studyId: string, siteId: string, patientId: number): TfStudySubjectRow | undefined {
  return queryOne<TfStudySubjectRow>(
    'SELECT * FROM tf_study_subjects WHERE study_id = ? AND site_id = ? AND patient_id = ?',
    [studyId, siteId, patientId]
  );
}

export function insert(studyId: string, siteId: string, patientId: number): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_study_subjects (study_id, site_id, patient_id) VALUES (?, ?, ?)',
    [studyId, siteId, patientId]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: PatientStatus): void {
  execute('UPDATE tf_study_subjects SET status = ? WHERE id = ?', [status, id]);
}
