import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../types';

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
  action: 'CREATE' | 'UPDATE',
  entityType: string,
  entityId: number,
  beforeJson: string | null,
  afterJson: string | null
): void {
  const user = context.user!;
  const db = getDb();
  // Email is stored in the JWT payload — no extra DB lookup needed
  const actorEmail = user.email;
  db.prepare(
    `INSERT INTO audit_logs (actorUserId, actorEmail, action, entityType, entityId, beforeJson, afterJson)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(user.userId, actorEmail, action, entityType, entityId, beforeJson, afterJson);
}
