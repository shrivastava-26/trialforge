import { GraphQLContext } from '../../types';
import { requireRole, requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import { saveFormResponseSchema } from '../../validation/schemas';
import * as edcService from '../../services/edcService';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

export const resolvers = {
  Query: {
    getFormInstancesByVisit: (_: unknown, args: { patientVisitId: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return edcService.getFormInstancesByVisit(args.patientVisitId);
    },

    getFormInstance: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return edcService.getFormInstance(args.id);
    },
  },

  Mutation: {
    createFormInstance: (_: unknown, args: { patientVisitId: number }, context: GraphQLContext) => {
      requireRole(context, 'SITE_COORDINATOR');
      return edcService.createFormInstance(args.patientVisitId);
    },

    saveFormResponse: (_: unknown, args: { formInstanceId: number; responseJson: string }, context: GraphQLContext) => {
      requireRole(context, 'SITE_COORDINATOR');
      const validated = parseOrThrow(saveFormResponseSchema, args);
      return edcService.saveFormResponse(validated.formInstanceId, validated.responseJson);
    },

    submitFormInstance: (_: unknown, args: { formInstanceId: number }, context: GraphQLContext) => {
      requireRole(context, 'SITE_COORDINATOR');
      return edcService.submitFormInstance(args.formInstanceId);
    },

    archiveFormInstance: (_: unknown, args: { formInstanceId: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return edcService.archiveFormInstance(args.formInstanceId);
    },
  },
};
