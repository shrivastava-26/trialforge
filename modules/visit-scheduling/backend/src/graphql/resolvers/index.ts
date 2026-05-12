import { GraphQLContext, PatientVisitStatus } from '../../types';
import { requireAuth, requireRole, requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import {
  paginationSchema,
  createVisitTemplateSchema,
  updateVisitTemplateSchema,
  schedulePatientVisitSchema,
  completePatientVisitSchema,
  updatePatientVisitStatusSchema,
} from '../../validation/schemas';
import * as visitService from '../../services/visitService';

/** Roles allowed to read visit data */
const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

export const resolvers = {
  Query: {
    getVisitTemplates: (
      _: unknown,
      args: { studyId: number; page?: number; pageSize?: number },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, [...READ_ROLES]);
      const { page, pageSize } = parseOrThrow(paginationSchema, {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
      return visitService.getVisitTemplates(args.studyId, page, pageSize);
    },

    getPatientVisits: (
      _: unknown,
      args: { studySubjectId: number; page?: number; pageSize?: number },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, [...READ_ROLES]);
      const { page, pageSize } = parseOrThrow(paginationSchema, {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
      return visitService.getPatientVisits(args.studySubjectId, page, pageSize);
    },

    getPatientVisit: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return visitService.getPatientVisit(args.id);
    },
  },

  Mutation: {
    createVisitTemplate: (
      _: unknown,
      args: { studyId: number; input: unknown },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, ['CRO_MANAGER', 'ADMIN']);
      const input = parseOrThrow(createVisitTemplateSchema, args.input);
      return visitService.createVisitTemplate(args.studyId, input);
    },

    updateVisitTemplate: (
      _: unknown,
      args: { id: number; input: unknown },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, ['CRO_MANAGER', 'ADMIN']);
      const input = parseOrThrow(updateVisitTemplateSchema, args.input);
      return visitService.updateVisitTemplate(args.id, input);
    },

    archiveVisitTemplate: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return visitService.archiveVisitTemplate(args.id);
    },

    schedulePatientVisit: (
      _: unknown,
      args: { studySubjectId: number; visitTemplateId: number; scheduledDate: string },
      context: GraphQLContext
    ) => {
      requireRole(context, 'SITE_COORDINATOR');
      const validated = parseOrThrow(schedulePatientVisitSchema, args);
      return visitService.schedulePatientVisit(validated.studySubjectId, validated.visitTemplateId, validated.scheduledDate);
    },

    completePatientVisit: (
      _: unknown,
      args: { id: number; completedDate: string },
      context: GraphQLContext
    ) => {
      requireRole(context, 'SITE_COORDINATOR');
      const validated = parseOrThrow(completePatientVisitSchema, args);
      return visitService.completePatientVisit(validated.id, validated.completedDate);
    },

    updatePatientVisitStatus: (
      _: unknown,
      args: { id: number; status: PatientVisitStatus },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, ['SITE_COORDINATOR', 'DATA_MANAGER']);
      const validated = parseOrThrow(updatePatientVisitStatusSchema, args);
      return visitService.updatePatientVisitStatus(validated.id, validated.status);
    },

    archivePatientVisit: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return visitService.archivePatientVisit(args.id);
    },
  },
};
