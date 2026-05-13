import { GraphQLContext } from '../../types';
import { requireRole, requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import {
  paginationSchema,
  createFormSchema,
  addFieldSchema,
  updateFieldSchema,
} from '../../validation/schemas';
import * as formService from '../../services/formService';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;
const WRITE_ROLES = ['CRO_MANAGER', 'ADMIN'] as const;

export const resolvers = {
  Query: {
    getForms: (_: unknown, args: { studyId: number; page?: number; pageSize?: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      const { page, pageSize } = parseOrThrow(paginationSchema, { page: args.page ?? 1, pageSize: args.pageSize ?? 20 });
      return formService.getForms(args.studyId, page, pageSize);
    },

    getForm: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return formService.getForm(args.id);
    },
  },

  Mutation: {
    createForm: (_: unknown, args: { studyId: number; name: string }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(createFormSchema, args);
      return formService.createForm(input.studyId, input.name);
    },

    addField: (_: unknown, args: { formId: number; input: unknown }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(addFieldSchema, args.input);
      return formService.addField(args.formId, input);
    },

    updateField: (_: unknown, args: { fieldId: number; input: unknown }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(updateFieldSchema, args.input);
      return formService.updateField(args.fieldId, input);
    },

    publishForm: (_: unknown, args: { formId: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      return formService.publishForm(args.formId);
    },

    createNewFormVersion: (_: unknown, args: { formId: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      return formService.createNewFormVersion(args.formId);
    },

    archiveForm: (_: unknown, args: { formId: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return formService.archiveForm(args.formId);
    },
  },
};
