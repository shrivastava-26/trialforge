import { GraphQLError } from 'graphql';
import { GraphQLContext, RoleName } from '../../types';

export function requireAuth(context: GraphQLContext): void {
  if (!context.user) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

function normalizeRoles(context: GraphQLContext): string[] {
  const u = context.user!;
  return u.roles ?? (u.role ? [u.role] : []);
}

export function requireRole(context: GraphQLContext, role: RoleName): void {
  requireAuth(context);
  if (!normalizeRoles(context).includes(role)) {
    throw new GraphQLError(`Forbidden: ${role} access required`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[]): void {
  requireAuth(context);
  const userRoles = normalizeRoles(context);
  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    throw new GraphQLError(`Forbidden: requires one of [${roles.join(', ')}]`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}
