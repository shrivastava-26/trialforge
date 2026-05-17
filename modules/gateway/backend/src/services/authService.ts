import { GraphQLError } from 'graphql';
import type { GatewayContext, Role } from '../types';

/**
 * Extracts user from context (populated during context creation via /me call).
 * Throws UNAUTHENTICATED if no user present.
 */
export function requireAuth(ctx: GatewayContext): NonNullable<GatewayContext['user']> {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user;
}

/**
 * Enforces role-based access. Throws FORBIDDEN if user's role is not in allowed list.
 */
export function requireRole(ctx: GatewayContext, roles: Role[]): NonNullable<GatewayContext['user']> {
  const user = requireAuth(ctx);
  if (!roles.includes(user.role)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}
