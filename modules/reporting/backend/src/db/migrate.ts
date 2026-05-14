import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    -- Mirror: study subjects (patient-registry)
    CREATE TABLE IF NOT EXISTS tf_study_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id    TEXT NOT NULL,
      site_id     TEXT NOT NULL,
      patient_id  INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'SCREENED',
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, site_id, patient_id)
    );

    -- Mirror: patients (patient-registry)
    CREATE TABLE IF NOT EXISTS tf_patients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL UNIQUE,
      status     TEXT NOT NULL DEFAULT 'SCREENED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Mirror: patient visits (visit-scheduling)
    CREATE TABLE IF NOT EXISTS tf_patient_visits (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      study_subject_id  INTEGER NOT NULL REFERENCES tf_study_subjects(id),
      visit_template_id INTEGER NOT NULL,
      scheduled_date    TEXT NOT NULL,
      completed_date    TEXT,
      status            TEXT NOT NULL DEFAULT 'PLANNED'
    );

    -- Mirror: forms (form-builder)
    CREATE TABLE IF NOT EXISTS tf_forms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id   INTEGER NOT NULL,
      name       TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      status     TEXT NOT NULL DEFAULT 'DRAFT'
    );

    -- Mirror: form instances (edc)
    CREATE TABLE IF NOT EXISTS tf_form_instances (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_visit_id INTEGER NOT NULL REFERENCES tf_patient_visits(id),
      form_id          INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'DRAFT',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Mirror: queries (query-management)
    CREATE TABLE IF NOT EXISTS tf_queries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      form_instance_id INTEGER NOT NULL REFERENCES tf_form_instances(id),
      title            TEXT NOT NULL,
      description      TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'OPEN',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Mirror: documents (document-management)
    CREATE TABLE IF NOT EXISTS tf_documents (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id   INTEGER NOT NULL,
      title      TEXT NOT NULL,
      category   TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Mirror: document versions
    CREATE TABLE IF NOT EXISTS tf_document_versions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id    INTEGER NOT NULL REFERENCES tf_documents(id),
      version_number INTEGER NOT NULL,
      file_ref       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_study_subjects').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Patients
  db.prepare("INSERT INTO tf_patients (subject_id, status) VALUES ('SUBJ-001', 'ENROLLED')").run();
  db.prepare("INSERT INTO tf_patients (subject_id, status) VALUES ('SUBJ-002', 'ENROLLED')").run();
  db.prepare("INSERT INTO tf_patients (subject_id, status) VALUES ('SUBJ-003', 'ARCHIVED')").run();
  db.prepare("INSERT INTO tf_patients (subject_id, status) VALUES ('SUBJ-004', 'SCREENED')").run();

  // Study subjects: 2 studies, 2 sites
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-001', 'SITE-A', 1, 'ENROLLED')").run();
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-001', 'SITE-B', 2, 'ENROLLED')").run();
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-001', 'SITE-A', 3, 'ARCHIVED')").run();
  db.prepare("INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES ('STUDY-002', 'SITE-B', 4, 'SCREENED')").run();

  // Patient visits linked to study subjects
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (1, 1, '2025-01-15', 'PLANNED')").run();
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (1, 2, '2025-01-22', 'COMPLETED')").run();
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (2, 1, '2025-01-15', 'MISSED')").run();
  db.prepare("INSERT INTO tf_patient_visits (study_subject_id, visit_template_id, scheduled_date, status) VALUES (2, 2, '2025-01-22', 'PLANNED')").run();

  // Forms
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Demographics', 1, 'ACTIVE')").run();
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (1, 'Vitals', 1, 'DRAFT')").run();
  db.prepare("INSERT INTO tf_forms (study_id, name, version, status) VALUES (2, 'Adverse Events', 1, 'ACTIVE')").run();

  // Form instances linked to visits
  db.prepare("INSERT INTO tf_form_instances (patient_visit_id, form_id, status) VALUES (1, 1, 'DRAFT')").run();
  db.prepare("INSERT INTO tf_form_instances (patient_visit_id, form_id, status) VALUES (2, 1, 'SUBMITTED')").run();
  db.prepare("INSERT INTO tf_form_instances (patient_visit_id, form_id, status) VALUES (3, 1, 'SUBMITTED')").run();

  // Queries linked to form instances
  db.prepare("INSERT INTO tf_queries (form_instance_id, title, description, status) VALUES (2, 'Age check', 'Verify age', 'OPEN')").run();
  db.prepare("INSERT INTO tf_queries (form_instance_id, title, description, status) VALUES (2, 'Sex mismatch', 'Check sex field', 'ANSWERED')").run();
  db.prepare("INSERT INTO tf_queries (form_instance_id, title, description, status) VALUES (3, 'BP high', 'Verify BP', 'CLOSED')").run();

  // Documents
  db.prepare("INSERT INTO tf_documents (study_id, title, category, status) VALUES (1, 'Protocol', 'Protocol', 'ACTIVE')").run();
  db.prepare("INSERT INTO tf_documents (study_id, title, category, status) VALUES (1, 'Old ICF', 'ICF', 'ARCHIVED')").run();
  db.prepare("INSERT INTO tf_documents (study_id, title, category, status) VALUES (2, 'Protocol v2', 'Protocol', 'ACTIVE')").run();

  // Document versions
  db.prepare("INSERT INTO tf_document_versions (document_id, version_number, file_ref, status) VALUES (1, 1, '/docs/proto-v1.pdf', 'ACTIVE')").run();
  db.prepare("INSERT INTO tf_document_versions (document_id, version_number, file_ref, status) VALUES (2, 1, '/docs/icf-v1.pdf', 'ARCHIVED')").run();
  db.prepare("INSERT INTO tf_document_versions (document_id, version_number, file_ref, status) VALUES (3, 1, '/docs/proto2-v1.pdf', 'ACTIVE')").run();
}
