import { queryAll, execute } from '../db/query';
import { TfQueryMessageRow, MessageAuthorRole } from '../types';

export function findByQueryId(queryId: number): TfQueryMessageRow[] {
  return queryAll<TfQueryMessageRow>(
    'SELECT * FROM tf_query_messages WHERE query_id = ? ORDER BY created_at ASC',
    [queryId]
  );
}

export function insert(queryId: number, message: string, authorRole: MessageAuthorRole): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_query_messages (query_id, message, author_role) VALUES (?, ?, ?)',
    [queryId, message, authorRole]
  );
  return lastInsertRowid;
}
