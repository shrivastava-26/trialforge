import { queryAll, queryOne } from '../db/query';
import { getDb } from '../db/connection';
import { AuditLogRow } from '../types';

export function insertAuditLog(
  actorUserId: number,
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: number,
  beforeJson: string | null,
  afterJson: string | null
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_logs (actorUserId, actorEmail, action, entityType, entityId, beforeJson, afterJson)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(actorUserId, actorEmail, action, entityType, entityId, beforeJson, afterJson);
}

export function queryAuditLogs(
  types: string[] | null,
  entityId: number | undefined,
  pageSize: number,
  offset: number
): { rows: AuditLogRow[]; total: number } {
  if (types && entityId !== undefined) {
    const ph = types.map(() => '?').join(',');
    const rows = queryAll<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE entityType IN (${ph}) AND entityId = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...types, entityId, pageSize, offset]
    );
    const total = (queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM audit_logs WHERE entityType IN (${ph}) AND entityId = ?`,
      [...types, entityId]
    ) ?? { cnt: 0 }).cnt;
    return { rows, total };
  }

  if (types) {
    const ph = types.map(() => '?').join(',');
    const rows = queryAll<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE entityType IN (${ph}) ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...types, pageSize, offset]
    );
    const total = (queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM audit_logs WHERE entityType IN (${ph})`,
      types
    ) ?? { cnt: 0 }).cnt;
    return { rows, total };
  }

  const rows = queryAll<AuditLogRow>(
    `SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  const total = (queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM audit_logs`) ?? { cnt: 0 }).cnt;
  return { rows, total };
}
