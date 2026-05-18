import { describe, it, expect } from 'vitest';
import { requireAuth, requireRole, requireAnyRole } from '../../graphql/resolvers/helpers';
import { GraphQLContext } from '../../types';

function makeContext(roles: string[] | null): GraphQLContext {
  if (roles === null) {
    return { user: null, req: {} as any, res: {} as any };
  }
  return {
    user: { id: '1', email: 'test@trialforge.io', roles },
    req: {} as any,
    res: {} as any,
  };
}

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'];

describe('RBAC helpers — query-management', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Not authenticated/);
    });
  });

  describe('createQuery / closeQuery / reopenQuery — DATA_MANAGER only', () => {
    it('DATA_MANAGER passes', () => {
      expect(() => requireRole(makeContext(['DATA_MANAGER']), 'DATA_MANAGER')).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['CRO_MANAGER']), 'DATA_MANAGER')).toThrow(/Forbidden/);
    });

    it('SITE_COORDINATOR is denied', () => {
      expect(() => requireRole(makeContext(['SITE_COORDINATOR']), 'DATA_MANAGER')).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireRole(makeContext(['AUDITOR']), 'DATA_MANAGER')).toThrow(/Forbidden/);
    });
  });

  describe('postQueryMessage — DATA_MANAGER or SITE_COORDINATOR', () => {
    it('DATA_MANAGER passes', () => {
      expect(() => requireAnyRole(makeContext(['DATA_MANAGER']), ['DATA_MANAGER', 'SITE_COORDINATOR'])).not.toThrow();
    });

    it('SITE_COORDINATOR passes', () => {
      expect(() => requireAnyRole(makeContext(['SITE_COORDINATOR']), ['DATA_MANAGER', 'SITE_COORDINATOR'])).not.toThrow();
    });

    it('CRO_MANAGER is denied', () => {
      expect(() => requireAnyRole(makeContext(['CRO_MANAGER']), ['DATA_MANAGER', 'SITE_COORDINATOR'])).toThrow(/Forbidden/);
    });

    it('AUDITOR is denied', () => {
      expect(() => requireAnyRole(makeContext(['AUDITOR']), ['DATA_MANAGER', 'SITE_COORDINATOR'])).toThrow(/Forbidden/);
    });
  });

  describe('archiveQuery — ADMIN only', () => {
    it('ADMIN passes', () => {
      expect(() => requireRole(makeContext(['ADMIN']), 'ADMIN')).not.toThrow();
    });

    it('DATA_MANAGER is denied', () => {
      expect(() => requireRole(makeContext(['DATA_MANAGER']), 'ADMIN')).toThrow(/Forbidden/);
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
