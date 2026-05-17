import { queryAll, queryOne, execute } from '../db/query';
import { TfQueryRow, QueryStatus } from '../types';

export function findById(id: number): TfQueryRow | undefined {
  return queryOne<TfQueryRow>('SELECT * FROM tf_queries WHERE id = ?', [id]);
}

export function findByFormInstanceId(
  formInstanceId: number,
  page: number,
  pageSize: number
): { rows: TfQueryRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tf_queries WHERE form_instance_id = ?',
    [formInstanceId]
  );
  const rows = queryAll<TfQueryRow>(
    'SELECT * FROM tf_queries WHERE form_instance_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [formInstanceId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findByFormInstanceIdFiltered(
  formInstanceId: number,
  page: number,
  pageSize: number,
  status?: string
): { rows: TfQueryRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const where = status
    ? 'WHERE form_instance_id = ? AND status = ?'
    : 'WHERE form_instance_id = ?';
  const params = status ? [formInstanceId, status] : [formInstanceId];
  const countRow = queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM tf_queries ${where}`,
    params
  );
  const rows = queryAll<TfQueryRow>(
    `SELECT * FROM tf_queries ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function insert(formInstanceId: number, title: string, description: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_queries (form_instance_id, title, description) VALUES (?, ?, ?)',
    [formInstanceId, title, description]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: QueryStatus): void {
  execute("UPDATE tf_queries SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
}
