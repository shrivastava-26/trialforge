import { requireAuth as sharedRequireAuth, requireAnyRole as sharedRequireAnyRole, normalizeRoles } from '@trialforge/shared-auth';
import { GraphQLContext, RoleName } from '../../types';

export { normalizeRoles };

export function requireAuth(context: GraphQLContext): void {
  sharedRequireAuth(context);
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[]): void {
  sharedRequireAnyRole(context, roles);
}
