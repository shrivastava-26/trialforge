import { GraphQLError } from 'graphql';
import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { ExaminerRow, StudyRow, SiteRow } from '../types';

export function getExaminersPaged(page: number, pageSize: number): { rows: ExaminerRow[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = queryAll<ExaminerRow>('SELECT * FROM examiners ORDER BY id ASC LIMIT ? OFFSET ?', [pageSize, offset]);
  const total = (queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM examiners') ?? { cnt: 0 }).cnt;
  return { rows, total };
}

export function getExaminerById(id: number): ExaminerRow | null {
  return queryOne<ExaminerRow>('SELECT * FROM examiners WHERE id = ?', [id]) ?? null;
}

export function getStudiesByExaminer(examinerId: number): StudyRow[] {
  return queryAll<StudyRow>(
    `SELECT DISTINCT s.* FROM studies s
     JOIN study_sites ss ON ss.study_id = s.id
     JOIN site_examiners se ON se.site_id = ss.site_id
     WHERE se.examiner_id = ? ORDER BY s.id ASC`,
    [examinerId]
  );
}

export function getSitesByExaminer(examinerId: number): SiteRow[] {
  return queryAll<SiteRow>(
    `SELECT si.* FROM sites si JOIN site_examiners se ON se.site_id = si.id WHERE se.examiner_id = ? ORDER BY si.id ASC`,
    [examinerId]
  );
}

export interface CreateExaminerInput {
  examinerCode: string;
  name: string;
  specialty: string;
  email: string;
  role: string;
  status?: string;
}

export function createExaminer(input: CreateExaminerInput): ExaminerRow {
  if (queryOne('SELECT id FROM examiners WHERE examinerCode = ?', [input.examinerCode])) {
    throw new GraphQLError(`Examiner code ${input.examinerCode} already exists`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const status = input.status ?? 'Active';
  const result = getDb().prepare(
    `INSERT INTO examiners (examinerCode, name, specialty, email, role, status) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(input.examinerCode, input.name, input.specialty, input.email, input.role, status);
  return getExaminerById(result.lastInsertRowid as number)!;
}

export interface UpdateExaminerInput {
  name?: string;
  specialty?: string;
  email?: string;
  role?: string;
  status?: string;
}

// Permitted column names for dynamic UPDATE
const EXAMINER_UPDATE_COLUMNS = new Set(['name', 'specialty', 'email', 'role', 'status']);

export function updateExaminer(id: number, input: UpdateExaminerInput): ExaminerRow {
  const existing = getExaminerById(id);
  if (!existing) throw new GraphQLError('Examiner not found', { extensions: { code: 'BAD_USER_INPUT' } });

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  // Safety: only allow known columns in the SET clause
  const invalidKey = fields.find(([k]) => !EXAMINER_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update examiner', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE examiners SET ${setClauses} WHERE id = ?`).run(...values, id);
  return getExaminerById(id)!;
}
