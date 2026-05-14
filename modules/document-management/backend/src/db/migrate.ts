import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tf_documents (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id   INTEGER NOT NULL,
      title      TEXT NOT NULL,
      category   TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tf_document_versions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id    INTEGER NOT NULL REFERENCES tf_documents(id),
      version_number INTEGER NOT NULL,
      file_ref       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK(status IN ('ACTIVE','SUPERSEDED','ARCHIVED')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(document_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS idx_tf_documents_study    ON tf_documents(study_id);
    CREATE INDEX IF NOT EXISTS idx_tf_documents_category ON tf_documents(category);
    CREATE INDEX IF NOT EXISTS idx_tf_documents_status   ON tf_documents(status);
    CREATE INDEX IF NOT EXISTS idx_tf_doc_versions_doc    ON tf_document_versions(document_id);
    CREATE INDEX IF NOT EXISTS idx_tf_doc_versions_status ON tf_document_versions(status);
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_documents').get() as { cnt: number };
  if (existing.cnt > 0) return;

  db.prepare("INSERT INTO tf_documents (study_id, title, category, status) VALUES (1, 'Study Protocol v1', 'Protocol', 'ACTIVE')").run();
  db.prepare("INSERT INTO tf_documents (study_id, title, category, status) VALUES (1, 'Informed Consent Form', 'ICF', 'DRAFT')").run();

  db.prepare("INSERT INTO tf_document_versions (document_id, version_number, file_ref, status) VALUES (1, 1, '/docs/study-001/protocol-v1.pdf', 'ACTIVE')").run();
}
