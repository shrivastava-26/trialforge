import { GraphQLError } from 'graphql';
import { GraphQLContext, RoleName } from '../../types';

export function requireAuth(context: GraphQLContext): void {
  if (!context.user) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[]): void {
  requireAuth(context);
  const userRoles = context.user!.roles ?? [];
  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    throw new GraphQLError(`Forbidden: requires one of [${roles.join(', ')}]`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}
