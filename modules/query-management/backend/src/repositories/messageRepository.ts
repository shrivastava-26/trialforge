import { queryAll, queryOne, execute } from '../db/query';
import { TfQueryMessageRow, MessageAuthorRole } from '../types';

export function findByQueryId(queryId: number): TfQueryMessageRow[] {
  return queryAll<TfQueryMessageRow>(
    'SELECT * FROM tf_query_messages WHERE query_id = ? ORDER BY created_at ASC',
    [queryId]
  );
}

export function findByQueryIdPaginated(
  queryId: number,
  page: number,
  pageSize: number
): { rows: TfQueryMessageRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tf_query_messages WHERE query_id = ?',
    [queryId]
  );
  const rows = queryAll<TfQueryMessageRow>(
    'SELECT * FROM tf_query_messages WHERE query_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
    [queryId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function insert(queryId: number, message: string, authorRole: MessageAuthorRole): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_query_messages (query_id, message, author_role) VALUES (?, ?, ?)',
    [queryId, message, authorRole]
  );
  return lastInsertRowid;
}
