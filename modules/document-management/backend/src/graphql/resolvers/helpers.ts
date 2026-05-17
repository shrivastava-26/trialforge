import { GraphQLError } from 'graphql';
import { GraphQLContext, RoleName } from '../../types';

function getUserRoles(context: GraphQLContext): RoleName[] {
  return context.user?.roles ?? (context.user?.role ? [context.user.role] : []);
}

export function requireAuth(context: GraphQLContext): void {
  if (!context.user) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

export function requireRole(context: GraphQLContext, role: RoleName): void {
  requireAuth(context);
  if (!getUserRoles(context).includes(role)) {
    throw new GraphQLError(`Forbidden: ${role} access required`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[]): void {
  requireAuth(context);
  const userRoles = getUserRoles(context);
  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    throw new GraphQLError(`Forbidden: requires one of [${roles.join(', ')}]`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}
