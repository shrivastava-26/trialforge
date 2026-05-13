import { queryOne, execute } from '../db/query';
import { TfFormResponseRow } from '../types';

export function findByInstanceId(formInstanceId: number): TfFormResponseRow | undefined {
  return queryOne<TfFormResponseRow>(
    'SELECT * FROM tf_form_responses WHERE form_instance_id = ?',
    [formInstanceId]
  );
}

export function upsert(formInstanceId: number, responseJson: string): void {
  const existing = findByInstanceId(formInstanceId);
  if (existing) {
    execute(
      "UPDATE tf_form_responses SET response_json = ?, saved_at = datetime('now') WHERE form_instance_id = ?",
      [responseJson, formInstanceId]
    );
  } else {
    execute(
      'INSERT INTO tf_form_responses (form_instance_id, response_json) VALUES (?, ?)',
      [formInstanceId, responseJson]
    );
  }
}

export function setSubmitted(formInstanceId: number): void {
  execute(
    "UPDATE tf_form_responses SET submitted_at = datetime('now') WHERE form_instance_id = ?",
    [formInstanceId]
  );
}
