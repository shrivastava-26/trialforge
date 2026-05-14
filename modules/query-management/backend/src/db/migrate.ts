import { getDb } from './connection';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    -- Cross-module mirror: form instances
    CREATE TABLE IF NOT EXISTS tf_form_instances (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_visit_id INTEGER NOT NULL,
      form_id          INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'DRAFT',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Query management owned tables
    CREATE TABLE IF NOT EXISTS tf_queries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      form_instance_id INTEGER NOT NULL REFERENCES tf_form_instances(id),
      title            TEXT NOT NULL,
      description      TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK(status IN ('OPEN','ANSWERED','CLOSED','ARCHIVED')),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tf_query_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      query_id    INTEGER NOT NULL REFERENCES tf_queries(id),
      message     TEXT NOT NULL,
      author_role TEXT NOT NULL
                    CHECK(author_role IN ('DATA_MANAGER','SITE_COORDINATOR','ADMIN')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tf_queries_instance ON tf_queries(form_instance_id);
    CREATE INDEX IF NOT EXISTS idx_tf_queries_status   ON tf_queries(status);
    CREATE INDEX IF NOT EXISTS idx_tf_queries_created  ON tf_queries(created_at);
    CREATE INDEX IF NOT EXISTS idx_tf_query_messages_query   ON tf_query_messages(query_id);
    CREATE INDEX IF NOT EXISTS idx_tf_query_messages_created ON tf_query_messages(created_at);
  `);

  seedData(db);
}

function seedData(db: ReturnType<typeof getDb>): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM tf_form_instances').get() as { cnt: number };
  if (existing.cnt > 0) return;

  // Seed form instances (mirrors EDC module)
  db.prepare("INSERT INTO tf_form_instances (patient_visit_id, form_id, status) VALUES (1, 1, 'SUBMITTED')").run();
  db.prepare("INSERT INTO tf_form_instances (patient_visit_id, form_id, status) VALUES (2, 1, 'DRAFT')").run();
}
