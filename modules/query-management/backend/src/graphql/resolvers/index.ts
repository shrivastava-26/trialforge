import { GraphQLContext, MessageAuthorRole } from '../../types';
import { requireRole, requireAnyRole } from './helpers';
import { normalizeRoles } from '@trialforge/shared-auth';
import { parseOrThrow } from '../../validation/helpers';
import { paginationSchema, createQuerySchema, postMessageSchema } from '../../validation/schemas';
import * as queryService from '../../services/queryService';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

export const resolvers = {
  RootQuery: {
    getQueriesByFormInstance: (
      _: unknown,
      args: { formInstanceId: number; page?: number; pageSize?: number },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, [...READ_ROLES]);
      const { page, pageSize } = parseOrThrow(paginationSchema, { page: args.page ?? 1, pageSize: args.pageSize ?? 20 });
      return queryService.getQueriesByFormInstance(args.formInstanceId, page, pageSize);
    },

    getQuery: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return queryService.getQuery(args.id);
    },
  },

  Mutation: {
    createQuery: (_: unknown, args: { formInstanceId: number; input: unknown }, context: GraphQLContext) => {
      requireRole(context, 'DATA_MANAGER');
      const input = parseOrThrow(createQuerySchema, { formInstanceId: args.formInstanceId, ...(args.input as object) });
      return queryService.createQuery(input.formInstanceId, input.title, input.description, input.message);
    },

    postQueryMessage: (_: unknown, args: { queryId: number; message: string }, context: GraphQLContext) => {
      requireAnyRole(context, ['DATA_MANAGER', 'SITE_COORDINATOR']);
      const validated = parseOrThrow(postMessageSchema, args);

      // Determine author role from user's roles
      const roles = normalizeRoles(context.user);
      let authorRole: MessageAuthorRole;
      if (roles.includes('DATA_MANAGER')) {
        authorRole = 'DATA_MANAGER';
      } else {
        authorRole = 'SITE_COORDINATOR';
      }

      return queryService.postQueryMessage(validated.queryId, validated.message, authorRole);
    },

    closeQuery: (_: unknown, args: { queryId: number }, context: GraphQLContext) => {
      requireRole(context, 'DATA_MANAGER');
      return queryService.closeQuery(args.queryId);
    },

    reopenQuery: (_: unknown, args: { queryId: number }, context: GraphQLContext) => {
      requireRole(context, 'DATA_MANAGER');
      return queryService.reopenQuery(args.queryId);
    },

    archiveQuery: (_: unknown, args: { queryId: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return queryService.archiveQuery(args.queryId);
    },
  },
};
