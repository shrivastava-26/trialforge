import { queryAll, queryOne, execute } from '../db/query';
import { TfFormInstanceRow, FormInstanceStatus } from '../types';

export function findById(id: number): TfFormInstanceRow | undefined {
  return queryOne<TfFormInstanceRow>('SELECT * FROM tf_form_instances WHERE id = ?', [id]);
}

export function findByVisitId(patientVisitId: number): TfFormInstanceRow[] {
  return queryAll<TfFormInstanceRow>(
    'SELECT * FROM tf_form_instances WHERE patient_visit_id = ? ORDER BY created_at DESC',
    [patientVisitId]
  );
}

export function findExisting(patientVisitId: number, formId: number): TfFormInstanceRow | undefined {
  return queryOne<TfFormInstanceRow>(
    'SELECT * FROM tf_form_instances WHERE patient_visit_id = ? AND form_id = ?',
    [patientVisitId, formId]
  );
}

export function insert(patientVisitId: number, formId: number): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_form_instances (patient_visit_id, form_id) VALUES (?, ?)',
    [patientVisitId, formId]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: FormInstanceStatus): void {
  execute("UPDATE tf_form_instances SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
}

export function findByPatientVisitIdFiltered(
  patientVisitId: number,
  page: number,
  pageSize: number,
  status?: string
): { rows: TfFormInstanceRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const where = status
    ? 'WHERE patient_visit_id = ? AND status = ?'
    : 'WHERE patient_visit_id = ?';
  const params = status ? [patientVisitId, status] : [patientVisitId];
  const countRow = queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM tf_form_instances ${where}`,
    params
  );
  const rows = queryAll<TfFormInstanceRow>(
    `SELECT * FROM tf_form_instances ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}
