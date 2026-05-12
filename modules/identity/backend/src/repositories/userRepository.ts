import { queryAll, queryOne, execute } from '../db/query';
import { TfUserRow, UserStatus } from '../types';

export function findUserById(id: number): TfUserRow | undefined {
  return queryOne<TfUserRow>('SELECT * FROM tf_users WHERE id = ?', [id]);
}

export function findUserByEmail(email: string): TfUserRow | undefined {
  return queryOne<TfUserRow>('SELECT * FROM tf_users WHERE email = ?', [email]);
}

export function findUsers(page: number, pageSize: number): { rows: TfUserRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = queryAll<TfUserRow>(
    'SELECT * FROM tf_users ORDER BY id ASC LIMIT ? OFFSET ?',
    [pageSize, offset]
  );
  const countRow = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tf_users');
  return { rows, total: countRow?.cnt ?? 0 };
}

export function insertUser(email: string, passwordHash: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_users (email, password_hash) VALUES (?, ?)',
    [email, passwordHash]
  );
  return lastInsertRowid;
}

export function updateUserStatus(id: number, status: UserStatus): void {
  execute(
    "UPDATE tf_users SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id]
  );
}

export function updateUserPassword(id: number, passwordHash: string): void {
  execute(
    "UPDATE tf_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    [passwordHash, id]
  );
}
