import {
  requireAuth as _requireAuth,
  requireAnyRole as _requireAnyRole,
  AuthContext,
} from '@trialforge/shared-auth';
import { GraphQLContext, RoleName } from '../../types';

export function requireAuth(context: GraphQLContext): void {
  _requireAuth(context as AuthContext);
}

export function requireRole(context: GraphQLContext, role: RoleName): void {
  _requireAnyRole(context as AuthContext, [role]);
}

export function requireAnyRole(context: GraphQLContext, roles: RoleName[]): void {
  _requireAnyRole(context as AuthContext, roles);
}
