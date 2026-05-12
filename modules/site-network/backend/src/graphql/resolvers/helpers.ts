import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../types';
import { insertAuditLog } from '../../repositories/auditRepository';

export function requireAuth(context: GraphQLContext): void {
  if (!context.user) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

export function requireAdmin(context: GraphQLContext): void {
  requireAuth(context);
  if (context.user!.role !== 'ADMIN') {
    throw new GraphQLError('Forbidden: admin access required', { extensions: { code: 'FORBIDDEN' } });
  }
}

export function logAudit(
  context: GraphQLContext,
  action: 'CREATE' | 'UPDATE' | 'ASSIGN' | 'UNASSIGN',
  entityType: string,
  entityId: number,
  beforeJson: string | null,
  afterJson: string | null
): void {
  const user = context.user!;
  insertAuditLog(user.userId, user.email, action, entityType, entityId, beforeJson, afterJson);
}
