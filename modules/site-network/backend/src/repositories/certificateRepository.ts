import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { ExaminerCertificateRow } from '../types';

export function findCertificatesByExaminerId(examinerId: number): ExaminerCertificateRow[] {
  return queryAll<ExaminerCertificateRow>(
    'SELECT * FROM examiner_certificates WHERE examiner_id = ? ORDER BY expiresOn DESC',
    [examinerId]
  );
}

export function findCertificateById(id: number): ExaminerCertificateRow | null {
  return queryOne<ExaminerCertificateRow>('SELECT * FROM examiner_certificates WHERE id = ?', [id]) ?? null;
}

export function countValidCertificates(examinerId: number, today: string): number {
  return (
    queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM examiner_certificates WHERE examiner_id = ? AND expiresOn >= ?',
      [examinerId, today]
    ) ?? { cnt: 0 }
  ).cnt;
}

export function findDuplicateCertificate(examinerId: number, certificateId: string): boolean {
  return !!queryOne(
    'SELECT id FROM examiner_certificates WHERE examiner_id = ? AND certificateId = ?',
    [examinerId, certificateId]
  );
}

export function findDuplicateCertificateExcluding(examinerId: number, certificateId: string, excludeId: number): boolean {
  return !!queryOne(
    'SELECT id FROM examiner_certificates WHERE examiner_id = ? AND certificateId = ? AND id != ?',
    [examinerId, certificateId, excludeId]
  );
}

export function insertCertificate(examinerId: number, certificateId: string, expiresOn: string): number {
  const result = getDb()
    .prepare('INSERT INTO examiner_certificates (examiner_id, certificateId, expiresOn) VALUES (?, ?, ?)')
    .run(examinerId, certificateId, expiresOn);
  return result.lastInsertRowid as number;
}

export function updateCertificateById(id: number, fields: Array<[string, unknown]>): void {
  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  getDb().prepare(`UPDATE examiner_certificates SET ${setClauses} WHERE id = ?`).run(...values, id);
}
