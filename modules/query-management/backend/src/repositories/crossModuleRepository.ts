import { queryOne } from '../db/query';
import { TfFormInstanceRow } from '../types';

export function findFormInstanceById(id: number): TfFormInstanceRow | undefined {
  return queryOne<TfFormInstanceRow>('SELECT * FROM tf_form_instances WHERE id = ?', [id]);
}
