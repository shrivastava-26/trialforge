import { GraphQLContext, PatientStatus } from '../../types';
import { requireAuth, requireRole, requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import {
  createPatientSchema,
  updatePatientSchema,
  assignPatientSchema,
  updateStudySubjectStatusSchema,
  paginationSchema,
  getStudySubjectsSchema,
} from '../../validation/schemas';
import * as patientService from '../../services/patientService';

export const resolvers = {
  Query: {
    getPatients: (
      _: unknown,
      args: { page?: number; pageSize?: number; filters?: { status?: PatientStatus } },
      context: GraphQLContext
    ) => {
      requireAuth(context);
      const { page, pageSize } = parseOrThrow(paginationSchema, {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
      return patientService.getPatients(page, pageSize, args.filters ?? undefined);
    },

    getPatient: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAuth(context);
      return patientService.getPatient(args.id);
    },

    getStudySubjects: (
      _: unknown,
      args: { studyId: string; siteId?: string; page?: number; pageSize?: number },
      context: GraphQLContext
    ) => {
      requireAuth(context);
      const validated = parseOrThrow(getStudySubjectsSchema, {
        studyId: args.studyId,
        siteId: args.siteId,
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
      return patientService.getStudySubjects(validated.studyId, validated.siteId, validated.page, validated.pageSize);
    },
  },

  Mutation: {
    createPatient: (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      requireAnyRole(context, ['ADMIN', 'SITE_COORDINATOR']);
      const input = parseOrThrow(createPatientSchema, args.input);
      return patientService.createPatient(input.subjectId);
    },

    updatePatient: (_: unknown, args: { id: number; input: unknown }, context: GraphQLContext) => {
      requireAnyRole(context, ['ADMIN', 'SITE_COORDINATOR']);
      const input = parseOrThrow(updatePatientSchema, args.input);
      return patientService.updatePatient(args.id, input);
    },

    assignPatientToStudySite: (
      _: unknown,
      args: { patientId: number; studyId: string; siteId: string },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, ['CRO_MANAGER', 'SITE_COORDINATOR']);
      const validated = parseOrThrow(assignPatientSchema, args);
      return patientService.assignPatientToStudySite(validated.patientId, validated.studyId, validated.siteId);
    },

    updateStudySubjectStatus: (
      _: unknown,
      args: { id: number; status: PatientStatus },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, ['SITE_COORDINATOR', 'DATA_MANAGER']);
      const validated = parseOrThrow(updateStudySubjectStatusSchema, args);
      return patientService.updateStudySubjectStatus(validated.id, validated.status);
    },

    archivePatient: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return patientService.archivePatient(args.id);
    },
  },
};
