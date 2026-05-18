import { describe, it, expect } from 'vitest';
import { requireAuth, requireRole, requireAnyRole } from '../../graphql/resolvers/helpers';
import { GraphQLContext, RoleName } from '../../types';

function makeContext(roles: RoleName[] | null): GraphQLContext {
  if (roles === null) {
    return { user: null, req: {} as any, res: {} as any, requestId: 'test-id' };
  }
  return {
    user: { id: '1', userId: 1, email: 'test@trialforge.io', roles },
    req: {} as any,
    res: {} as any,
    requestId: 'test-id',
  };
}

const WRITE_ROLES: RoleName[] = ['CRO_MANAGER', 'ADMIN'];
const READ_ROLES: RoleName[] = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'];

describe('RBAC helpers — form-builder', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Not authenticated/);
    });
  });

  describe('write operations — CRO_MANAGER or ADMIN only', () => {
    it('CRO_MANAGER passes', () => {
      expect(() => requireAnyRole(makeContext(['CRO_MANAGER']), WRITE_ROLES)).not.toThrow();
    });

    it('ADMIN passes', () => {
      expect(() => requireAnyRole(makeContext(['ADMIN']), WRITE_ROLES)).not.toThrow();
    });

    it('SITE_COORDINATOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['SITE_COORDINATOR']), WRITE_ROLES)).toThrow(/Forbidden/);
    });

    it('DATA_MANAGER is denied', () => {
      expect(() => requireAnyRole(makeContext(['DATA_MANAGER']), WRITE_ROLES)).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['AUDITOR']), WRITE_ROLES)).toThrow(/Forbidden/);
    });
  });

  describe('read operations — broad access', () => {
    for (const role of READ_ROLES) {
      it(`${role} can read`, () => {
        expect(() => requireAnyRole(makeContext([role]), READ_ROLES)).not.toThrow();
      });
    }

    it('MONITOR is denied read', () => {
      expect(() => requireAnyRole(makeContext(['MONITOR']), READ_ROLES)).toThrow(/Forbidden/);
    });
  });

  describe('archiveForm — ADMIN only', () => {
    it('ADMIN passes', () => {
      expect(() => requireRole(makeContext(['ADMIN']), 'ADMIN')).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['CRO_MANAGER']), 'ADMIN')).toThrow(/Forbidden/);
    });
  });
});
