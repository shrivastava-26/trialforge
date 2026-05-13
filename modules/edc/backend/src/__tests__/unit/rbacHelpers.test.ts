import { describe, it, expect } from 'vitest';
import { requireAuth, requireRole, requireAnyRole } from '../../graphql/resolvers/helpers';
import { GraphQLContext, RoleName } from '../../types';

function makeContext(roles: RoleName[] | null): GraphQLContext {
  if (roles === null) {
    return { user: null, req: {} as any, res: {} as any };
  }
  return {
    user: { userId: 1, email: 'test@trialforge.io', roles },
    req: {} as any,
    res: {} as any,
  };
}

const READ_ROLES: RoleName[] = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'];

describe('RBAC helpers — edc', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Unauthorized/);
    });
  });

  describe('create/save/submit — SITE_COORDINATOR only', () => {
    it('SITE_COORDINATOR passes', () => {
      expect(() => requireRole(makeContext(['SITE_COORDINATOR']), 'SITE_COORDINATOR')).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['CRO_MANAGER']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });

    it('DATA_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['DATA_MANAGER']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireRole(makeContext(['AUDITOR']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });

    it('ADMIN is denied (not SITE_COORDINATOR)', () => {
      expect(() => requireRole(makeContext(['ADMIN']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });
  });

  describe('archive — ADMIN only', () => {
    it('ADMIN passes', () => {
      expect(() => requireRole(makeContext(['ADMIN']), 'ADMIN')).not.toThrow();
    });

    it('SITE_COORDINATOR is denied', () => {
      expect(() => requireRole(makeContext(['SITE_COORDINATOR']), 'ADMIN')).toThrow(/Forbidden/);
    });
  });

  describe('read operations — broad access', () => {
    for (const role of READ_ROLES) {
      it(`${role} can read`, () => {
        expect(() => requireAnyRole(makeContext([role]), READ_ROLES)).not.toThrow();
      });
    }

    it('MONITOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['MONITOR']), READ_ROLES)).toThrow(/Forbidden/);
    });
  });
});
