import { queryAll, queryOne, execute } from '../db/query';
import { TfVisitTemplateRow, VisitTemplateStatus } from '../types';

export function findById(id: number): TfVisitTemplateRow | undefined {
  return queryOne<TfVisitTemplateRow>('SELECT * FROM tf_visit_templates WHERE id = ?', [id]);
}

export function findByStudyId(
  studyId: number,
  page: number,
  pageSize: number
): { rows: TfVisitTemplateRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const countRow = queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tf_visit_templates WHERE study_id = ?',
    [studyId]
  );
  const rows = queryAll<TfVisitTemplateRow>(
    'SELECT * FROM tf_visit_templates WHERE study_id = ? ORDER BY day_offset ASC LIMIT ? OFFSET ?',
    [studyId, pageSize, offset]
  );
  return { rows, total: countRow?.cnt ?? 0 };
}

export function findByStudyAndName(studyId: number, name: string): TfVisitTemplateRow | undefined {
  return queryOne<TfVisitTemplateRow>(
    'SELECT * FROM tf_visit_templates WHERE study_id = ? AND name = ?',
    [studyId, name]
  );
}

export function insert(
  studyId: number,
  name: string,
  dayOffset: number,
  windowMinDays: number,
  windowMaxDays: number
): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_visit_templates (study_id, name, day_offset, window_min_days, window_max_days) VALUES (?, ?, ?, ?, ?)',
    [studyId, name, dayOffset, windowMinDays, windowMaxDays]
  );
  return lastInsertRowid;
}

export function update(
  id: number,
  fields: { name?: string; dayOffset?: number; windowMinDays?: number; windowMaxDays?: number }
): void {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.dayOffset !== undefined) { sets.push('day_offset = ?'); params.push(fields.dayOffset); }
  if (fields.windowMinDays !== undefined) { sets.push('window_min_days = ?'); params.push(fields.windowMinDays); }
  if (fields.windowMaxDays !== undefined) { sets.push('window_max_days = ?'); params.push(fields.windowMaxDays); }
  if (sets.length === 0) return;
  params.push(id);
  execute(`UPDATE tf_visit_templates SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function updateStatus(id: number, status: VisitTemplateStatus): void {
  execute('UPDATE tf_visit_templates SET status = ? WHERE id = ?', [status, id]);
}
