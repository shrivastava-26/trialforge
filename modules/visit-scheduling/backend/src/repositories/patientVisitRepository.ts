import { queryAll, queryOne, execute } from '../db/query';
import { TfPatientVisitRow, PatientVisitStatus } from '../types';

export function findById(id: number): TfPatientVisitRow | undefined {
  return queryOne<TfPatientVisitRow>('SELECT * FROM tf_patient_visits WHERE id = ?', [id]);
}

export function findByStudySubjectId(
  studySubjectId: number,
  page: number,
  pageSize: number
): { rows: TfPatientVisitRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tf_patient_visits WHERE study_subject_id = ?',
    [studySubjectId]
  );
  const rows = queryAll<TfPatientVisitRow>(
    'SELECT * FROM tf_patient_visits WHERE study_subject_id = ? ORDER BY scheduled_date ASC LIMIT ? OFFSET ?',
    [studySubjectId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findExisting(studySubjectId: number, visitTemplateId: number): TfPatientVisitRow | undefined {
  return queryOne<TfPatientVisitRow>(
    'SELECT * FROM tf_patient_visits WHERE study_subject_id = ? AND visit_template_id = ?',
    [studySubjectId, visitTemplateId]
  );
}

export function insert(studySubjectId: number, visitTemplateId: number, scheduledDate: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date) VALUES (?, ?, ?)',
    [studySubjectId, visitTemplateId, scheduledDate]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: PatientVisitStatus): void {
  execute('UPDATE tf_patient_visits SET status = ? WHERE id = ?', [status, id]);
}

export function setCompleted(id: number, completedDate: string): void {
  execute(
    "UPDATE tf_patient_visits SET status = 'COMPLETED', completed_date = ? WHERE id = ?",
    [completedDate, id]
  );
}

export function findByStudySubjectIdFiltered(
  studySubjectId: number,
  page: number,
  pageSize: number,
  status?: string
): { rows: TfPatientVisitRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const where = status
    ? 'WHERE study_subject_id = ? AND status = ?'
    : 'WHERE study_subject_id = ?';
  const params = status ? [studySubjectId, status] : [studySubjectId];
  const countRow = queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM tf_patient_visits ${where}`,
    params
  );
  const rows = queryAll<TfPatientVisitRow>(
    `SELECT * FROM tf_patient_visits ${where} ORDER BY scheduled_date ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}
