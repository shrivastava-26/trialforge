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

describe('RBAC helpers', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Unauthorized/);
    });

    it('passes when user present', () => {
      expect(() => requireAuth(makeContext(['MONITOR']))).not.toThrow();
    });
  });

  describe('requireRole', () => {
    it('throws FORBIDDEN when user lacks role', () => {
      expect(() => requireRole(makeContext(['MONITOR']), 'ADMIN')).toThrow(/Forbidden/);
    });

    it('passes when user has role', () => {
      expect(() => requireRole(makeContext(['ADMIN']), 'ADMIN')).not.toThrow();
    });
  });

  describe('requireAnyRole', () => {
    it('throws FORBIDDEN when user has none of the roles', () => {
      expect(() =>
        requireAnyRole(makeContext(['MONITOR', 'AUDITOR']), ['ADMIN', 'SITE_COORDINATOR'])
      ).toThrow(/Forbidden/);
    });

    it('passes when user has at least one role', () => {
      expect(() =>
        requireAnyRole(makeContext(['SITE_COORDINATOR']), ['ADMIN', 'SITE_COORDINATOR'])
      ).not.toThrow();
    });

    it('denies MONITOR from createPatient-like operations', () => {
      expect(() =>
        requireAnyRole(makeContext(['MONITOR']), ['ADMIN', 'SITE_COORDINATOR'])
      ).toThrow(/Forbidden/);
    });

    it('denies AUDITOR from assignPatient-like operations', () => {
      expect(() =>
        requireAnyRole(makeContext(['AUDITOR']), ['CRO_MANAGER', 'SITE_COORDINATOR'])
      ).toThrow(/Forbidden/);
    });
  });
});
