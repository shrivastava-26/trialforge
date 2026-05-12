import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { requireAuth, requireAdmin, logAudit } from '../../graphql/resolvers/helpers';
import { GraphQLContext } from '../../types';
import { queryAuditLogs } from '../../repositories/auditRepository';

process.env.JWT_SECRET = 'test-secret-key-for-helpers';

beforeAll(() => {
  setupTestDb();
});

function makeContext(user: GraphQLContext['user']): GraphQLContext {
  return {
    user,
    req: {} as GraphQLContext['req'],
    res: {} as GraphQLContext['res'],
    requestId: 'test-req-id',
    loaders: {} as GraphQLContext['loaders'],
  };
}

describe('requireAuth', () => {
  it('throws UNAUTHENTICATED when user is null', () => {
    const ctx = makeContext(null);
    expect(() => requireAuth(ctx)).toThrow();
    try { requireAuth(ctx); } catch (e: unknown) {
      expect((e as { extensions?: { code?: string } }).extensions?.code).toBe('UNAUTHENTICATED');
    }
  });

  it('does not throw when user is present', () => {
    const ctx = makeContext({ userId: 1, role: 'VIEWER', email: 'v@t.com' });
    expect(() => requireAuth(ctx)).not.toThrow();
  });
});

describe('requireAdmin', () => {
  it('throws UNAUTHENTICATED when user is null', () => {
    const ctx = makeContext(null);
    try { requireAdmin(ctx); } catch (e: unknown) {
      expect((e as { extensions?: { code?: string } }).extensions?.code).toBe('UNAUTHENTICATED');
    }
  });

  it('throws FORBIDDEN when user is VIEWER', () => {
    const ctx = makeContext({ userId: 2, role: 'VIEWER', email: 'v@t.com' });
    try { requireAdmin(ctx); } catch (e: unknown) {
      expect((e as { extensions?: { code?: string } }).extensions?.code).toBe('FORBIDDEN');
    }
  });

  it('does not throw when user is ADMIN', () => {
    const ctx = makeContext({ userId: 1, role: 'ADMIN', email: 'a@t.com' });
    expect(() => requireAdmin(ctx)).not.toThrow();
  });
});

describe('logAudit', () => {
  it('inserts an audit log entry with correct fields', () => {
    const ctx = makeContext({ userId: 1, role: 'ADMIN', email: 'admin@test.com' });
    const before = JSON.stringify({ title: 'Old' });
    const after = JSON.stringify({ title: 'New' });

    logAudit(ctx, 'UPDATE', 'Study', 42, before, after);

    const { rows } = queryAuditLogs(['Study'], 42, 10, 0);
    const entry = rows.find((r) => r.entityId === 42 && r.action === 'UPDATE');
    expect(entry).toBeDefined();
    expect(entry!.actorEmail).toBe('admin@test.com');
    expect(entry!.actorUserId).toBe(1);
    expect(entry!.beforeJson).toBe(before);
    expect(entry!.afterJson).toBe(after);
  });

  it('handles null before/after for CREATE action', () => {
    const ctx = makeContext({ userId: 1, role: 'ADMIN', email: 'admin@test.com' });
    logAudit(ctx, 'CREATE', 'Site', 99, null, JSON.stringify({ name: 'New Site' }));

    const { rows } = queryAuditLogs(['Site'], 99, 10, 0);
    const entry = rows.find((r) => r.entityId === 99 && r.action === 'CREATE');
    expect(entry).toBeDefined();
    expect(entry!.beforeJson).toBeNull();
    expect(entry!.afterJson).toContain('New Site');
  });

  it('logs ASSIGN action correctly', () => {
    const ctx = makeContext({ userId: 1, role: 'ADMIN', email: 'admin@test.com' });
    logAudit(ctx, 'ASSIGN', 'StudySite', 10, null, JSON.stringify({ studyId: 10, siteId: 20 }));

    const { rows } = queryAuditLogs(['StudySite'], 10, 10, 0);
    const entry = rows.find((r) => r.action === 'ASSIGN' && r.entityType === 'StudySite');
    expect(entry).toBeDefined();
  });

  it('logs UNASSIGN action correctly', () => {
    const ctx = makeContext({ userId: 1, role: 'ADMIN', email: 'admin@test.com' });
    logAudit(ctx, 'UNASSIGN', 'SiteExaminer', 5, JSON.stringify({ siteId: 5, examinerId: 3 }), null);

    const { rows } = queryAuditLogs(['SiteExaminer'], 5, 10, 0);
    const entry = rows.find((r) => r.action === 'UNASSIGN' && r.entityType === 'SiteExaminer');
    expect(entry).toBeDefined();
    expect(entry!.afterJson).toBeNull();
  });
});
