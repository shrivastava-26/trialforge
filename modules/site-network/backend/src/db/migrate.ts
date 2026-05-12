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
      study_id       INTEGER NOT NULL REFERENCES studies(id) ON DELETE RESTRICT,
      site_id        INTEGER NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
      examiner_id    INTEGER NOT NULL REFERENCES examiners(id) ON DELETE RESTRICT,
      certificate_id INTEGER NOT NULL REFERENCES examiner_certificates(id) ON DELETE RESTRICT,
      PRIMARY KEY (study_id, site_id, examiner_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      actorUserId INTEGER NOT NULL,
      actorEmail  TEXT NOT NULL,
      action      TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','ASSIGN','UNASSIGN')),
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

    CREATE TABLE IF NOT EXISTS examiner_certificates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      examiner_id INTEGER NOT NULL REFERENCES examiners(id) ON DELETE RESTRICT,
      certificateId TEXT NOT NULL,
      expiresOn   TEXT NOT NULL,
      UNIQUE(examiner_id, certificateId)
    );

    CREATE INDEX IF NOT EXISTS idx_cert_examiner   ON examiner_certificates(examiner_id);
    CREATE INDEX IF NOT EXISTS idx_cert_expires    ON examiner_certificates(expiresOn);

    -- Refresh token sessions (no hard deletes; revoked_at used to invalidate)
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                INTEGER NOT NULL REFERENCES users(id),
      token_hash             TEXT NOT NULL UNIQUE,
      expires_at             TEXT NOT NULL,
      revoked_at             TEXT,
      replaced_by_token_hash TEXT,
      created_at             TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_rt_user_id    ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);
  `);

  // Migrate existing tables — add columns that may be missing from older DB files.
  // SQLite does not support IF NOT EXISTS on ALTER TABLE, so we catch the error.
  try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'VIEWER'`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE examiners ADD COLUMN role TEXT NOT NULL DEFAULT 'Sub-Investigator'`); } catch { /* already exists */ }

  // Migration shim: add certificate_id to study_site_examiners if missing
  try { db.exec(`ALTER TABLE study_site_examiners ADD COLUMN certificate_id INTEGER NOT NULL DEFAULT 0 REFERENCES examiner_certificates(id) ON DELETE RESTRICT`); } catch { /* already exists */ }

  // Widen audit_logs action CHECK to include ASSIGN/UNASSIGN.
  // SQLite cannot ALTER CHECK constraints, so we recreate the table if the old constraint is in place.
  try {
    db.prepare(`INSERT INTO audit_logs (actorUserId, actorEmail, action, entityType, entityId) VALUES (0, '__migration_test__', 'ASSIGN', '__test__', 0)`).run();
    db.prepare(`DELETE FROM audit_logs WHERE actorEmail = '__migration_test__'`).run();
  } catch {
    // Old CHECK constraint rejects ASSIGN — recreate table
    db.exec(`
      ALTER TABLE audit_logs RENAME TO audit_logs_old;
      CREATE TABLE audit_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        actorUserId INTEGER NOT NULL,
        actorEmail  TEXT NOT NULL,
        action      TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','ASSIGN','UNASSIGN')),
        entityType  TEXT NOT NULL,
        entityId    INTEGER NOT NULL,
        beforeJson  TEXT,
        afterJson   TEXT,
        createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO audit_logs SELECT * FROM audit_logs_old;
      DROP TABLE audit_logs_old;
      CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actorUserId);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entityType, entityId);
    `);
  }

  seedUsers(db);
  seedCertificates(db);
}

function seedCertificates(db: ReturnType<typeof getDb>) {
  // Only seed if examiners exist and no certificates yet
  const hasExaminers = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM examiners');
  if (!hasExaminers || hasExaminers.cnt === 0) return;
  const hasCerts = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM examiner_certificates');
  if (hasCerts && hasCerts.cnt > 0) return;

  // Examiner 1: valid cert (expires next year)
  const ex1 = queryOne<{ id: number }>('SELECT id FROM examiners ORDER BY id ASC LIMIT 1');
  // Examiner 2: expired cert (expired last year)
  const ex2 = queryOne<{ id: number }>('SELECT id FROM examiners ORDER BY id ASC LIMIT 1 OFFSET 1');
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);

  if (ex1) {
    db.prepare('INSERT OR IGNORE INTO examiner_certificates (examiner_id, certificateId, expiresOn) VALUES (?, ?, ?)')
      .run(ex1.id, 'GCP-CERT-001', fmtDate(nextYear));
  }
  if (ex2) {
    db.prepare('INSERT OR IGNORE INTO examiner_certificates (examiner_id, certificateId, expiresOn) VALUES (?, ?, ?)')
      .run(ex2.id, 'GCP-CERT-002', fmtDate(lastYear));
  }
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

