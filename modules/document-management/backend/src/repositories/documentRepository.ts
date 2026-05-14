import { queryAll, queryOne, execute } from '../db/query';
import { TfDocumentRow, DocumentStatus } from '../types';

export function findById(id: number): TfDocumentRow | undefined {
  return queryOne<TfDocumentRow>('SELECT * FROM tf_documents WHERE id = ?', [id]);
}

export function findByStudyId(
  studyId: number,
  page: number,
  pageSize: number,
  filters?: { category?: string; status?: DocumentStatus }
): { rows: TfDocumentRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  let where = 'WHERE study_id = ?';
  const params: unknown[] = [studyId];

  if (filters?.category) { where += ' AND category = ?'; params.push(filters.category); }
  if (filters?.status) { where += ' AND status = ?'; params.push(filters.status); }

  const countRow = queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM tf_documents ${where}`, params);
  const rows = queryAll<TfDocumentRow>(
    `SELECT * FROM tf_documents ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function insert(studyId: number, title: string, category: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_documents (study_id, title, category) VALUES (?, ?, ?)',
    [studyId, title, category]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: DocumentStatus): void {
  execute("UPDATE tf_documents SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
}
