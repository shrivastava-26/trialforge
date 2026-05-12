import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tf_patients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL UNIQUE,
      status     TEXT NOT NULL DEFAULT 'SCREENED'
                   CHECK(status IN ('SCREENED','ELIGIBLE','ENROLLED','WITHDRAWN','COMPLETED','ARCHIVED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tf_study_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id    TEXT NOT NULL,
      site_id     TEXT NOT NULL,
      patient_id  INTEGER NOT NULL REFERENCES tf_patients(id),
      status      TEXT NOT NULL DEFAULT 'SCREENED'
                    CHECK(status IN ('SCREENED','ELIGIBLE','ENROLLED','WITHDRAWN','COMPLETED','ARCHIVED')),
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(study_id, site_id, patient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_patients_subject_id ON tf_patients(subject_id);
    CREATE INDEX IF NOT EXISTS idx_tf_patients_status     ON tf_patients(status);

    CREATE INDEX IF NOT EXISTS idx_tf_study_subjects_study   ON tf_study_subjects(study_id);
    CREATE INDEX IF NOT EXISTS idx_tf_study_subjects_site    ON tf_study_subjects(site_id);
    CREATE INDEX IF NOT EXISTS idx_tf_study_subjects_patient ON tf_study_subjects(patient_id);
    CREATE INDEX IF NOT EXISTS idx_tf_study_subjects_status  ON tf_study_subjects(status);
  `);

  seedPatients(db);
}

function seedPatients(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_patients').get() as { cnt: number };
  if (existing.cnt > 0) return;

  const insertPatient = db.prepare(
    'INSERT INTO tf_patients (subject_id, status) VALUES (?, ?)'
  );
  const insertAssignment = db.prepare(
    'INSERT INTO tf_study_subjects (study_id, site_id, patient_id, status) VALUES (?, ?, ?, ?)'
  );

  const patients: Array<[string, string]> = [
    ['SUBJ-0001', 'ENROLLED'],
    ['SUBJ-0002', 'ELIGIBLE'],
    ['SUBJ-0003', 'SCREENED'],
    ['SUBJ-0004', 'COMPLETED'],
    ['SUBJ-0005', 'WITHDRAWN'],
  ];

  for (const [subjectId, status] of patients) {
    insertPatient.run(subjectId, status);
  }

  // Assign first two patients to a demo study/site
  insertAssignment.run('STUDY-001', 'SITE-A', 1, 'ENROLLED');
  insertAssignment.run('STUDY-001', 'SITE-A', 2, 'ELIGIBLE');
  insertAssignment.run('STUDY-001', 'SITE-B', 1, 'ENROLLED');
}
