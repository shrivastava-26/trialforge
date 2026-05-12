import { getDb } from './connection';
import { queryOne } from './query';
import { hashPassword } from '../utils/password';
import { RoleName } from '../types';

const SEED_ROLES: RoleName[] = [
  'ADMIN',
  'CRO_MANAGER',
  'SITE_COORDINATOR',
  'DATA_MANAGER',
  'MONITOR',
  'AUDITOR',
];

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tf_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','ARCHIVED')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tf_roles (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tf_user_roles (
      user_id INTEGER NOT NULL REFERENCES tf_users(id),
      role_id INTEGER NOT NULL REFERENCES tf_roles(id),
      PRIMARY KEY (user_id, role_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_users_email  ON tf_users(email);
    CREATE INDEX IF NOT EXISTS idx_tf_users_status ON tf_users(status);
    CREATE INDEX IF NOT EXISTS idx_tf_user_roles_user ON tf_user_roles(user_id);
  `);

  seedRoles(db);
  seedAdminUser(db);
}

function seedRoles(db: ReturnType<typeof getDb>): void {
  const stmt = db.prepare('INSERT OR IGNORE INTO tf_roles (name) VALUES (?)');
  for (const role of SEED_ROLES) {
    stmt.run(role);
  }
}

function seedAdminUser(db: ReturnType<typeof getDb>): void {
  const existing = queryOne<{ id: number }>('SELECT id FROM tf_users WHERE email = ?', ['admin@trialforge.io']);
  if (existing) return;

  const hash = hashPassword('admin123');
  const result = db.prepare(
    'INSERT INTO tf_users (email, password_hash, status) VALUES (?, ?, ?)'
  ).run('admin@trialforge.io', hash, 'ACTIVE');

  const userId = result.lastInsertRowid as number;
  const adminRole = queryOne<{ id: number }>('SELECT id FROM tf_roles WHERE name = ?', ['ADMIN']);
  if (adminRole) {
    db.prepare('INSERT OR IGNORE INTO tf_user_roles (user_id, role_id) VALUES (?, ?)').run(userId, adminRole.id);
  }
}
