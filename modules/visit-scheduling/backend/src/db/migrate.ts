import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    -- Local copy of study subjects for cross-module validation.
    -- In production this would be resolved via GraphQL federation or event sync.
    CREATE TABLE IF NOT EXISTS tf_study_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id    TEXT NOT NULL,
      site_id     TEXT NOT NULL,
      patient_id  INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'SCREENED'
                    CHECK(status IN ('SCREENED','ELIGIBLE','ENROLLED','WITHDRAWN','COMPLETED','ARCHIVED')),
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, site_id, patient_id)
    );

    CREATE TABLE IF NOT EXISTS tf_visit_templates (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id        INTEGER NOT NULL,
      name            TEXT NOT NULL,
      day_offset      INTEGER NOT NULL DEFAULT 0,
      window_min_days INTEGER NOT NULL DEFAULT 0,
      window_max_days INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK(status IN ('ACTIVE','ARCHIVED')),
      UNIQUE(study_id, name)
    );

    CREATE TABLE IF NOT EXISTS tf_patient_visits (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      study_subject_id  INTEGER NOT NULL REFERENCES tf_study_subjects(id),
      visit_template_id INTEGER NOT NULL REFERENCES tf_visit_templates(id),
      scheduled_date    TEXT NOT NULL,
      completed_date    TEXT,
      status            TEXT NOT NULL DEFAULT 'PLANNED'
                          CHECK(status IN ('PLANNED','COMPLETED','MISSED','CANCELLED','ARCHIVED')),
      UNIQUE(study_subject_id, visit_template_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_visit_templates_study  ON tf_visit_templates(study_id);
    CREATE INDEX IF NOT EXISTS idx_tf_patient_visits_subject ON tf_patient_visits(study_subject_id);
    CREATE INDEX IF NOT EXISTS idx_tf_patient_visits_status  ON tf_patient_visits(status);
    CREATE INDEX IF NOT EXISTS idx_tf_patient_visits_date    ON tf_patient_visits(scheduled_date);
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_visit_templates').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Seed study subjects (mirrors patient-registry seed)
  const insertSS = db.prepare(
    'INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES (?, ?, ?, ?)'
  );
  insertSS.run('STUDY-001', 'SITE-A', 1, 'ENROLLED');
  insertSS.run('STUDY-001', 'SITE-A', 2, 'ELIGIBLE');
  insertSS.run('STUDY-001', 'SITE-B', 1, 'ENROLLED');

  // Seed visit templates for STUDY-001 (studyId = 1 as integer reference)
  const insertVT = db.prepare(
    'INSERT INTO tf_visit_templates (study_id, name, day_offset, window_min_days, window_max_days) VALUES (?, ?, ?, ?, ?)'
  );
  insertVT.run(1, 'Screening', 0, 0, 3);
  insertVT.run(1, 'Baseline', 7, 0, 2);
  insertVT.run(1, 'Week 4', 28, -3, 3);
  insertVT.run(1, 'Week 12', 84, -5, 5);

  // Seed a scheduled visit for enrolled subject
  db.prepare(
    'INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date) VALUES (?, ?, ?)'
  ).run(1, 1, '2025-01-15');
}
