import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { getDb } from '../db/connection';
import { hashPassword } from '../utils/password';

/** Boots an in-memory SQLite DB with the full schema + seed users. */
export function setupTestDb(): void {
  initConnection(':memory:');
  initDb();
}

/** Inserts a test user and returns their id. */
export function seedUser(email: string, password: string, role: 'ADMIN' | 'VIEWER'): number {
  const hashed = hashPassword(password);
  const result = getDb()
    .prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)')
    .run(email, hashed, role);
  return result.lastInsertRowid as number;
}
