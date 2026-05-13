import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    -- Cross-module mirror: study subjects
    CREATE TABLE IF NOT EXISTS tf_study_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id    TEXT NOT NULL,
      site_id     TEXT NOT NULL,
      patient_id  INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'SCREENED',
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, site_id, patient_id)
    );

    -- Cross-module mirror: patient visits
    CREATE TABLE IF NOT EXISTS tf_patient_visits (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      study_subject_id  INTEGER NOT NULL REFERENCES tf_study_subjects(id),
      visit_template_id INTEGER NOT NULL,
      scheduled_date    TEXT NOT NULL,
      completed_date    TEXT,
      status            TEXT NOT NULL DEFAULT 'PLANNED',
      UNIQUE(study_subject_id, visit_template_id)
    );

    -- Cross-module mirror: forms
    CREATE TABLE IF NOT EXISTS tf_forms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id   INTEGER NOT NULL,
      name       TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      status     TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, name, version)
    );

    -- Cross-module mirror: form fields
    CREATE TABLE IF NOT EXISTS tf_form_fields (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id       INTEGER NOT NULL REFERENCES tf_forms(id),
      field_key     TEXT NOT NULL,
      label         TEXT NOT NULL,
      field_type    TEXT NOT NULL,
      required      INTEGER NOT NULL DEFAULT 0,
      options_json  TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(form_id, field_key)
    );

    -- EDC-owned tables
    CREATE TABLE IF NOT EXISTS tf_form_instances (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_visit_id INTEGER NOT NULL REFERENCES tf_patient_visits(id),
      form_id          INTEGER NOT NULL REFERENCES tf_forms(id),
      status           TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK(status IN ('DRAFT','SUBMITTED','ARCHIVED')),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(patient_visit_id, form_id)
    );

    CREATE TABLE IF NOT EXISTS tf_form_responses (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      form_instance_id INTEGER NOT NULL REFERENCES tf_form_instances(id),
      response_json    TEXT NOT NULL,
      saved_at         TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at     TEXT,
      UNIQUE(form_instance_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_form_instances_visit  ON tf_form_instances(patient_visit_id);
    CREATE INDEX IF NOT EXISTS idx_tf_form_instances_form   ON tf_form_instances(form_id);
    CREATE INDEX IF NOT EXISTS idx_tf_form_instances_status ON tf_form_instances(status);
    CREATE INDEX IF NOT EXISTS idx_tf_form_responses_saved  ON tf_form_responses(saved_at);
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_study_subjects').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Seed study subjects
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-001', 'SITE-A', 1, 'ENROLLED')").run();
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-001', 'SITE-A', 2, 'ELIGIBLE')").run();

  // Seed patient visits (study_subject_id=1 is ENROLLED)
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (1, 1, '2025-01-15', 'PLANNED')").run();
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (1, 2, '2025-01-22', 'CANCELLED')").run();

  // Seed forms (study_id=1 integer maps to STUDY-001)
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Demographics', 1, 'ACTIVE')").run();
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Vital Signs', 1, 'DRAFT')").run();
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (2, 'Other Study Form', 1, 'ACTIVE')").run();

  // Seed form fields for Demographics (form_id=1)
  const ins = db.prepare('INSERT INTO tf_form_fields (form_id, field_key, label, field_type, required, options_json, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
  ins.run(1, 'age', 'Age', 'NUMBER', 1, null, 1);
  ins.run(1, 'sex', 'Sex', 'DROPDOWN', 1, '["Male","Female","Other"]', 2);
  ins.run(1, 'notes', 'Notes', 'TEXTAREA', 0, null, 3);
  ins.run(1, 'consent', 'Consent Given', 'CHECKBOX', 1, null, 4);
  ins.run(1, 'visit_date', 'Visit Date', 'DATE', 1, null, 5);
}
