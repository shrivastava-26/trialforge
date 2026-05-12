import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { getDb } from '../../db/connection';
import { getAuditLogs } from '../../services/auditService';
import { insertAuditLog } from '../../repositories/auditRepository';

beforeEach(() => { setupTestDb(); });

function seedLog(action: string, entityType: string, entityId: number) {
  insertAuditLog(1, 'admin@test.com', action, entityType, entityId, null, '{}');
}

describe('getAuditLogs — basic queries', () => {
  it('returns all logs when no filters provided', () => {
    seedLog('CREATE', 'Study', 1);
    seedLog('UPDATE', 'Site', 2);
    const result = getAuditLogs(undefined, undefined, undefined, 1, 25);
    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
  });

  it('returns logs ordered by id DESC (newest first)', () => {
    seedLog('CREATE', 'Study', 1);
    seedLog('UPDATE', 'Study', 1);
    const result = getAuditLogs(undefined, undefined, undefined, 1, 25);
    expect(result.rows[0].action).toBe('UPDATE');
    expect(result.rows[1].action).toBe('CREATE');
  });

  it('returns empty result when no logs exist', () => {
    const result = getAuditLogs(undefined, undefined, undefined, 1, 25);
    expect(result.total).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});

describe('getAuditLogs — single entityType filter', () => {
  it('filters by single entityType string', () => {
    seedLog('CREATE', 'Study', 1);
    seedLog('ASSIGN', 'StudySite', 1);
    seedLog('CREATE', 'Site', 2);
    const result = getAuditLogs('Study', undefined, undefined, 1, 25);
    expect(result.total).toBe(1);
    expect(result.rows[0].entityType).toBe('Study');
  });
});

describe('getAuditLogs — entityTypes array filter', () => {
  it('entityTypes array takes priority over single entityType', () => {
    seedLog('CREATE', 'Study', 1);
    seedLog('ASSIGN', 'StudySite', 1);
    seedLog('ASSIGN', 'StudySiteExaminer', 1);
    seedLog('CREATE', 'Site', 2);
    // entityTypes array should override the single entityType
    const result = getAuditLogs('Site', ['Study', 'StudySite', 'StudySiteExaminer'], undefined, 1, 25);
    expect(result.total).toBe(3);
    expect(result.rows.every((r) => ['Study', 'StudySite', 'StudySiteExaminer'].includes(r.entityType))).toBe(true);
  });

  it('returns junction audit entries alongside main entity entries', () => {
    seedLog('CREATE', 'Examiner', 5);
    seedLog('ASSIGN', 'SiteExaminer', 5);
    seedLog('CREATE', 'ExaminerCertificate', 5);
    const result = getAuditLogs(undefined, ['Examiner', 'SiteExaminer', 'ExaminerCertificate'], undefined, 1, 25);
    expect(result.total).toBe(3);
    const types = result.rows.map((r) => r.entityType);
    expect(types).toContain('Examiner');
    expect(types).toContain('SiteExaminer');
    expect(types).toContain('ExaminerCertificate');
  });
});

describe('getAuditLogs — entityId filter', () => {
  it('filters by entityId when combined with entityTypes', () => {
    seedLog('CREATE', 'Study', 10);
    seedLog('ASSIGN', 'StudySite', 10);
    seedLog('CREATE', 'Study', 99);
    const result = getAuditLogs(undefined, ['Study', 'StudySite'], 10, 1, 25);
    expect(result.total).toBe(2);
    expect(result.rows.every((r) => r.entityId === 10)).toBe(true);
  });

  it('filters by entityId with single entityType', () => {
    seedLog('CREATE', 'Study', 7);
    seedLog('UPDATE', 'Study', 7);
    seedLog('CREATE', 'Study', 8);
    const result = getAuditLogs('Study', undefined, 7, 1, 25);
    expect(result.total).toBe(2);
    expect(result.rows.every((r) => r.entityId === 7)).toBe(true);
  });
});

describe('getAuditLogs — pagination', () => {
  it('respects pageSize', () => {
    for (let i = 0; i < 5; i++) seedLog('CREATE', 'Study', i + 1);
    const result = getAuditLogs(undefined, undefined, undefined, 1, 3);
    expect(result.rows).toHaveLength(3);
    expect(result.total).toBe(5);
  });

  it('returns correct page 2', () => {
    for (let i = 0; i < 5; i++) seedLog('CREATE', 'Study', i + 1);
    const page1 = getAuditLogs(undefined, undefined, undefined, 1, 3);
    const page2 = getAuditLogs(undefined, undefined, undefined, 2, 3);
    expect(page2.rows).toHaveLength(2);
    // No overlap between pages
    const ids1 = new Set(page1.rows.map((r) => r.id));
    page2.rows.forEach((r) => expect(ids1.has(r.id)).toBe(false));
  });
});

describe('insertAuditLog', () => {
  it('stores all fields correctly', () => {
    insertAuditLog(42, 'actor@test.com', 'ASSIGN', 'StudySite', 99, '{"before":1}', '{"after":2}');
    const row = getDb()
      .prepare('SELECT * FROM audit_logs WHERE actorUserId = 42')
      .get() as Record<string, unknown>;
    expect(row.actorEmail).toBe('actor@test.com');
    expect(row.action).toBe('ASSIGN');
    expect(row.entityType).toBe('StudySite');
    expect(row.entityId).toBe(99);
    expect(row.beforeJson).toBe('{"before":1}');
    expect(row.afterJson).toBe('{"after":2}');
  });

  it('accepts all four action types', () => {
    for (const action of ['CREATE', 'UPDATE', 'ASSIGN', 'UNASSIGN']) {
      expect(() => insertAuditLog(1, 'a@b.com', action, 'Study', 1, null, null)).not.toThrow();
    }
  });
});
