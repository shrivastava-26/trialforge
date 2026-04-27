import { getDb } from './connection';
import { queryOne } from './query';
import { hashPassword } from '../utils/password';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      email    TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'VIEWER' CHECK(role IN ('ADMIN','VIEWER'))
    );

    CREATE TABLE IF NOT EXISTS studies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolId  TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      sponsor     TEXT NOT NULL DEFAULT '',
      phase       TEXT NOT NULL DEFAULT '',
      startDate   TEXT NOT NULL DEFAULT '',
      endDate     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned','Active','Completed')),
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sites (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      siteCode  TEXT NOT NULL UNIQUE,
      name      TEXT NOT NULL,
      city      TEXT NOT NULL DEFAULT '',
      country   TEXT NOT NULL DEFAULT '',
      status    TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned','Active','Closed'))
    );

    CREATE TABLE IF NOT EXISTS examiners (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      examinerCode TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      specialty    TEXT NOT NULL DEFAULT '',
      email        TEXT NOT NULL DEFAULT '',
      role         TEXT NOT NULL DEFAULT 'Sub-Investigator' CHECK(role IN ('Principal Investigator','Sub-Investigator')),
      status       TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS study_sites (
      study_id INTEGER NOT NULL REFERENCES studies(id),
      site_id  INTEGER NOT NULL REFERENCES sites(id),
      PRIMARY KEY (study_id, site_id)
    );

    CREATE TABLE IF NOT EXISTS site_examiners (
      site_id     INTEGER NOT NULL REFERENCES sites(id),
      examiner_id INTEGER NOT NULL REFERENCES examiners(id),
      PRIMARY KEY (site_id, examiner_id)
    );

    CREATE TABLE IF NOT EXISTS study_site_examiners (
      study_id    INTEGER NOT NULL REFERENCES studies(id) ON DELETE RESTRICT,
      site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
      examiner_id INTEGER NOT NULL REFERENCES examiners(id) ON DELETE RESTRICT,
      PRIMARY KEY (study_id, site_id, examiner_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      actorUserId INTEGER NOT NULL,
      actorEmail  TEXT NOT NULL,
      action      TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE')),
      entityType  TEXT NOT NULL,
      entityId    INTEGER NOT NULL,
      beforeJson  TEXT,
      afterJson   TEXT,
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for search performance
    CREATE INDEX IF NOT EXISTS idx_studies_title    ON studies(title);
    CREATE INDEX IF NOT EXISTS idx_studies_sponsor  ON studies(sponsor);
    CREATE INDEX IF NOT EXISTS idx_studies_status   ON studies(status);
    CREATE INDEX IF NOT EXISTS idx_studies_phase    ON studies(phase);
    CREATE INDEX IF NOT EXISTS idx_sites_name       ON sites(name);
    CREATE INDEX IF NOT EXISTS idx_sites_city       ON sites(city);
    CREATE INDEX IF NOT EXISTS idx_sites_country    ON sites(country);
    CREATE INDEX IF NOT EXISTS idx_sites_status     ON sites(status);
    CREATE INDEX IF NOT EXISTS idx_examiners_name   ON examiners(name);
    CREATE INDEX IF NOT EXISTS idx_examiners_role   ON examiners(role);
    CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_logs(actorUserId);
    CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs(entityType, entityId);
    CREATE INDEX IF NOT EXISTS idx_sse_study_site   ON study_site_examiners(study_id, site_id);
    CREATE INDEX IF NOT EXISTS idx_sse_examiner     ON study_site_examiners(examiner_id);
  `);

  // Migrate existing tables — add columns that may be missing from older DB files.
  // SQLite does not support IF NOT EXISTS on ALTER TABLE, so we catch the error.
  try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'VIEWER'`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE examiners ADD COLUMN role TEXT NOT NULL DEFAULT 'Sub-Investigator'`); } catch { /* already exists */ }

  seedUsers(db);
}

function seedUsers(db: ReturnType<typeof getDb>) {
  if (!queryOne('SELECT id FROM users WHERE email = ?', ['viewer@test.com'])) {
    db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(
      'viewer@test.com', hashPassword('password123'), 'VIEWER'
    );
  }
  if (!queryOne('SELECT id FROM users WHERE email = ?', ['admin@test.com'])) {
    db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(
      'admin@test.com', hashPassword('password123'), 'ADMIN'
    );
  }
}

