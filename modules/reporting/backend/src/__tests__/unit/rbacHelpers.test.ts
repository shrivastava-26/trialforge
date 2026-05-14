import { describe, it, expect } from 'vitest';
import { requireAuth, requireAnyRole } from '../../graphql/resolvers/helpers';
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

const READ_ROLES: RoleName[] = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'MONITOR', 'AUDITOR'];

describe('RBAC helpers — reporting', () => {
  it('throws UNAUTHENTICATED when no user', () => {
    expect(() => requireAuth(makeContext(null))).toThrow(/Unauthorized/);
  });

  for (const role of READ_ROLES) {
    it(`${role} can access metrics`, () => {
      expect(() => requireAnyRole(makeContext([role]), READ_ROLES)).not.toThrow();
    });
  }
});
