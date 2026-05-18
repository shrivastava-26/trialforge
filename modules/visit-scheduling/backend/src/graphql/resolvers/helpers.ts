import { requireAuth as sharedRequireAuth, requireAnyRole as sharedRequireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext, RoleName } from '../../types';

/**
 * Adapts local GraphQLContext to shared-auth's AuthContext shape.
 * Local JwtPayload uses `userId` (number) while shared-auth expects `id` (string).
 */
function toAuthContext(context: GraphQLContext) {
  if (!context.user) return { user: null };
  return {
    user: {
      id: String(context.user.userId),
      email: context.user.email,
      roles: context.user.roles as string[],
    },
  };
}

export function requireAuth(context: GraphQLContext): void {
  sharedRequireAuth(toAuthContext(context));
}

export function requireRole(context: GraphQLContext, role: RoleName): void {
  sharedRequireAnyRole(toAuthContext(context), [role]);
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[] | readonly string[]): void {
  sharedRequireAnyRole(toAuthContext(context), roles as string[]);
}
