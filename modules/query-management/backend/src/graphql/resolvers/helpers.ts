import { requireAuth, requireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext } from '../../types';

export { requireAuth, requireAnyRole };

export function requireRole(context: GraphQLContext, role: string): void {
  requireAnyRole(context, [role]);
}
