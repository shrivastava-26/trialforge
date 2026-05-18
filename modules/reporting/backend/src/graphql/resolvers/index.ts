import { normalizeRoles } from '@trialforge/shared-auth';
import { GraphQLContext, RoleName } from '../../types';
import { requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import { metricsFilterSchema } from '../../validation/schemas';
import * as metricsService from '../../services/metricsService';

const READ_ROLES: RoleName[] = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'MONITOR', 'AUDITOR'];

export const resolvers = {
  Query: {
    getDashboardMetrics: (
      _: unknown,
      args: { studyId?: string; siteId?: string },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, READ_ROLES);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: args.studyId, siteId: args.siteId });
      const userRoles = normalizeRoles(context.user) as RoleName[];
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
      requireAnyRole(context, READ_ROLES);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: args.studyId, siteId: args.siteId });
      const userRoles = normalizeRoles(context.user) as RoleName[];
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
      requireAnyRole(context, READ_ROLES);
      const filter = parseOrThrow(metricsFilterSchema, { studyId: parent.id, siteId: args.siteId });
      const userRoles = normalizeRoles(context.user) as RoleName[];
      return metricsService.getDashboardMetrics(filter, userRoles);
    },
  },
};
