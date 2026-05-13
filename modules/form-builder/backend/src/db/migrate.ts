import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tf_forms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id   INTEGER NOT NULL,
      name       TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      status     TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, name, version)
    );

    CREATE TABLE IF NOT EXISTS tf_form_fields (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id       INTEGER NOT NULL REFERENCES tf_forms(id),
      field_key     TEXT NOT NULL,
      label         TEXT NOT NULL,
      field_type    TEXT NOT NULL
                      CHECK(field_type IN ('TEXT','NUMBER','DATE','DROPDOWN','RADIO','CHECKBOX','TEXTAREA')),
      required      INTEGER NOT NULL DEFAULT 0,
      options_json  TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(form_id, field_key)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_forms_study  ON tf_forms(study_id);
    CREATE INDEX IF NOT EXISTS idx_tf_forms_status ON tf_forms(status);
    CREATE INDEX IF NOT EXISTS idx_tf_form_fields_form ON tf_form_fields(form_id);
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_forms').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Seed a demo form for study 1
  db.prepare(
    "INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Demographics', 1, 'ACTIVE')"
  ).run();
  db.prepare(
    "INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Vital Signs', 1, 'DRAFT')"
  ).run();

  // Fields for Demographics form (id=1)
  const insertField = db.prepare(
    'INSERT INTO tf_form_fields (form_id, field_key, label, field_type, required, options_json, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertField.run(1, 'age', 'Age', 'NUMBER', 1, null, 1);
  insertField.run(1, 'sex', 'Sex', 'DROPDOWN', 1, '["Male","Female","Other"]', 2);
  insertField.run(1, 'ethnicity', 'Ethnicity', 'TEXT', 0, null, 3);

  // Fields for Vital Signs form (id=2)
  insertField.run(2, 'systolic_bp', 'Systolic BP', 'NUMBER', 1, null, 1);
  insertField.run(2, 'diastolic_bp', 'Diastolic BP', 'NUMBER', 1, null, 2);
  insertField.run(2, 'heart_rate', 'Heart Rate', 'NUMBER', 1, null, 3);
}
