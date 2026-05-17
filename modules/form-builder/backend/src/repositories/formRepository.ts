import { queryAll, queryOne, execute } from '../db/query';
import { TfFormRow, FormStatus } from '../types';

export function findById(id: number): TfFormRow | undefined {
  return queryOne<TfFormRow>('SELECT * FROM tf_forms WHERE id = ?', [id]);
}

export function findByStudyId(studyId: number, page: number, pageSize: number): { rows: TfFormRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tf_forms WHERE study_id = ?', [studyId]);
  const rows = queryAll<TfFormRow>(
    'SELECT * FROM tf_forms WHERE study_id = ? ORDER BY name ASC, version DESC LIMIT ? OFFSET ?',
    [studyId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findByStudyIdFiltered(studyId: number, page: number, pageSize: number, status?: string): { rows: TfFormRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  if (status) {
    const countRow = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tf_forms WHERE study_id = ? AND status = ?', [studyId, status]);
    const rows = queryAll<TfFormRow>(
      'SELECT * FROM tf_forms WHERE study_id = ? AND status = ? ORDER BY name ASC, version DESC LIMIT ? OFFSET ?',
      [studyId, status, pageSize, offset]
    );
    return { rows, total: countRow?.cnt ?? 0 };
  }
  return findByStudyId(studyId, page, pageSize);
}

export function findByStudyNameVersion(studyId: number, name: string, version: number): TfFormRow | undefined {
  return queryOne<TfFormRow>(
    'SELECT * FROM tf_forms WHERE study_id = ? AND name = ? AND version = ?',
    [studyId, name, version]
  );
}

export function findActiveByStudyName(studyId: number, name: string): TfFormRow | undefined {
  return queryOne<TfFormRow>(
    "SELECT * FROM tf_forms WHERE study_id = ? AND name = ? AND status = 'ACTIVE'",
    [studyId, name]
  );
}

export function findMaxVersion(studyId: number, name: string): number {
  const row = queryOne<{ mv: number }>(
    'SELECT MAX(version) as mv FROM tf_forms WHERE study_id = ? AND name = ?',
    [studyId, name]
  );
  return row?.mv ?? 0;
}

export function insert(studyId: number, name: string, version: number): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_forms (study_id, name, version) VALUES (?, ?, ?)',
    [studyId, name, version]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: FormStatus): void {
  execute("UPDATE tf_forms SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
}
