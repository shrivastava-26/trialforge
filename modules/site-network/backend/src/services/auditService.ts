import { AuditLogRow } from '../types';
import { queryAuditLogs } from '../repositories/auditRepository';

export interface AuditLogsPage {
  rows: AuditLogRow[];
  total: number;
}

export function getAuditLogs(
  entityType?: string,
  entityTypes?: string[],
  entityId?: number,
  page = 1,
  pageSize = 25
): AuditLogsPage {
  const offset = (page - 1) * pageSize;
  const types = entityTypes?.length ? entityTypes : entityType ? [entityType] : null;
  return queryAuditLogs(types, entityId, pageSize, offset);
}
