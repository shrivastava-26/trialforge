import { requireAuth as sharedRequireAuth, requireAnyRole as sharedRequireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext, RoleName } from '../../types';

export function requireAuth(context: GraphQLContext): void {
  sharedRequireAuth(context);
}

export function requireRole(context: GraphQLContext, role: RoleName): void {
  sharedRequireAnyRole(context, [role]);
}

export function requireAnyRole(context: GraphQLContext, roles: readonly string[] | string[]): void {
  sharedRequireAnyRole(context, [...roles]);
}
