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

describe('RBAC helpers — visit-scheduling', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Unauthorized/);
    });
  });

  describe('schedulePatientVisit — SITE_COORDINATOR only', () => {
    it('SITE_COORDINATOR passes', () => {
      expect(() => requireRole(makeContext(['SITE_COORDINATOR']), 'SITE_COORDINATOR')).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['CRO_MANAGER']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireRole(makeContext(['AUDITOR']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });

    it('DATA_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['DATA_MANAGER']), 'SITE_COORDINATOR')).toThrow(/Forbidden/);
    });
  });

  describe('createVisitTemplate — CRO_MANAGER or ADMIN', () => {
    it('CRO_MANAGER passes', () => {
      expect(() => requireAnyRole(makeContext(['CRO_MANAGER']), ['CRO_MANAGER', 'ADMIN'])).not.toThrow();
    });

    it('ADMIN passes', () => {
      expect(() => requireAnyRole(makeContext(['ADMIN']), ['CRO_MANAGER', 'ADMIN'])).not.toThrow();
    });

    it('SITE_COORDINATOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['SITE_COORDINATOR']), ['CRO_MANAGER', 'ADMIN'])).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['AUDITOR']), ['CRO_MANAGER', 'ADMIN'])).toThrow(/Forbidden/);
    });
  });

  describe('read operations — broad access', () => {
    const readRoles: RoleName[] = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'];

    for (const role of readRoles) {
      it(`${role} can read`, () => {
        expect(() => requireAnyRole(makeContext([role]), readRoles)).not.toThrow();
      });
    }

    it('MONITOR is denied read', () => {
      expect(() => requireAnyRole(makeContext(['MONITOR']), readRoles)).toThrow(/Forbidden/);
    });
  });

  describe('updatePatientVisitStatus — SITE_COORDINATOR or DATA_MANAGER', () => {
    it('SITE_COORDINATOR passes', () => {
      expect(() =>
        requireAnyRole(makeContext(['SITE_COORDINATOR']), ['SITE_COORDINATOR', 'DATA_MANAGER'])
      ).not.toThrow();
    });

    it('DATA_MANAGER passes', () => {
      expect(() =>
        requireAnyRole(makeContext(['DATA_MANAGER']), ['SITE_COORDINATOR', 'DATA_MANAGER'])
      ).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() =>
        requireAnyRole(makeContext(['CRO_MANAGER']), ['SITE_COORDINATOR', 'DATA_MANAGER'])
      ).toThrow(/Forbidden/);
    });
  });
});
