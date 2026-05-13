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
