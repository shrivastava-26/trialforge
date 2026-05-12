import { describe, it, expect } from 'vitest';
import { requireAuth, requireRole, requireAnyRole } from '../../graphql/resolvers/helpers';
import { GraphQLContext, RoleName } from '../../types';

function makeContext(user: GraphQLContext['user']): GraphQLContext {
  return { user, req: {} as any, res: {} as any };
}

describe('RBAC helpers', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when user is null', () => {
      expect(() => requireAuth(makeContext(null))).toThrow(/Unauthorized/);
    });

    it('passes when user is present', () => {
      expect(() =>
        requireAuth(makeContext({ userId: 1, email: 'a@b.com', roles: ['MONITOR'] }))
      ).not.toThrow();
    });
  });

  describe('requireRole', () => {
    it('throws UNAUTHENTICATED when user is null', () => {
      expect(() => requireRole(makeContext(null), 'ADMIN')).toThrow(/Unauthorized/);
    });

    it('throws FORBIDDEN when user lacks the role', () => {
      const ctx = makeContext({ userId: 1, email: 'a@b.com', roles: ['MONITOR'] });
      expect(() => requireRole(ctx, 'ADMIN')).toThrow(/Forbidden/);
    });

    it('passes when user has the role', () => {
      const ctx = makeContext({ userId: 1, email: 'a@b.com', roles: ['ADMIN'] });
      expect(() => requireRole(ctx, 'ADMIN')).not.toThrow();
    });

    it('passes when user has multiple roles including required', () => {
      const ctx = makeContext({ userId: 1, email: 'a@b.com', roles: ['MONITOR', 'ADMIN'] });
      expect(() => requireRole(ctx, 'ADMIN')).not.toThrow();
    });
  });

  describe('requireAnyRole', () => {
    it('throws FORBIDDEN when user has none of the roles', () => {
      const ctx = makeContext({ userId: 1, email: 'a@b.com', roles: ['MONITOR'] });
      expect(() => requireAnyRole(ctx, ['ADMIN', 'CRO_MANAGER'])).toThrow(/Forbidden/);
    });

    it('passes when user has one of the roles', () => {
      const ctx = makeContext({ userId: 1, email: 'a@b.com', roles: ['CRO_MANAGER'] });
      expect(() => requireAnyRole(ctx, ['ADMIN', 'CRO_MANAGER'])).not.toThrow();
    });
  });
});
