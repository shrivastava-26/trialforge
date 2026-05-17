import { GraphQLContext } from '../../types';
import { requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import { metricsFilterSchema } from '../../validation/schemas';
import * as metricsService from '../../services/metricsService';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'MONITOR', 'AUDITOR'] as const;

export const resolvers = {
  Query: {
    getDashboardMetrics: (
      _: unknown,
      args: { studyId?: string; siteId?: string },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, [...READ_ROLES]);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: args.studyId, siteId: args.siteId });
      const userRoles = context.user!.roles ?? [];
      return metricsService.getDashboardMetrics(filter, userRoles);
    },
  },
  User: {
    __resolveReference(ref: { id: string }) {
      return ref;
    },
    metrics(
      _parent: { id: string },
      args: { studyId?: string; siteId?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: args.studyId, siteId: args.siteId });
      const userRoles = context.user!.roles ?? [];
      return metricsService.getDashboardMetrics(filter, userRoles);
    },
  },
  Study: {
    __resolveReference(ref: { id: string }) {
      return ref;
    },
    metrics(
      parent: { id: string },
      args: { siteId?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: parent.id, siteId: args.siteId });
      const userRoles = context.user!.roles ?? [];
      return metricsService.getDashboardMetrics(filter, userRoles);
    },
  },
};
