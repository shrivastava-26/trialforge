import { queryAll } from '../db/query';
import { StudyRow, SiteRow, ExaminerRow } from '../types';

export function searchStudies(kw: string, status?: string, phase?: string): StudyRow[] {
  const params: unknown[] = [kw, kw, kw];
  let where = `(LOWER(title) LIKE ? OR LOWER(sponsor) LIKE ? OR LOWER(protocolId) LIKE ?)`;
  if (status) { where += ` AND status = ?`; params.push(status); }
  if (phase)  { where += ` AND phase = ?`;  params.push(phase); }
  return queryAll<StudyRow>(`SELECT * FROM studies WHERE ${where} ORDER BY id ASC`, params);
}

export function searchSites(kw: string, city?: string, country?: string): SiteRow[] {
  const params: unknown[] = [kw, kw, kw];
  let where = `(LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ?)`;
  if (city)    { where += ` AND LOWER(city) = LOWER(?)`; params.push(city); }
  if (country) { where += ` AND LOWER(country) = LOWER(?)`; params.push(country); }
  return queryAll<SiteRow>(`SELECT * FROM sites WHERE ${where} ORDER BY id ASC`, params);
}

export function searchExaminers(kw: string, role?: string): ExaminerRow[] {
  const params: unknown[] = [kw, kw];
  let where = `(LOWER(name) LIKE ? OR LOWER(specialty) LIKE ?)`;
  if (role) { where += ` AND role = ?`; params.push(role); }
  return queryAll<ExaminerRow>(`SELECT * FROM examiners WHERE ${where} ORDER BY id ASC`, params);
}
