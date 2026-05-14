import { GraphQLContext, DocumentStatus } from '../../types';
import { requireRole, requireAnyRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import { paginationSchema, createDocumentSchema, addVersionSchema, setDocumentStatusSchema } from '../../validation/schemas';
import * as documentService from '../../services/documentService';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'MONITOR', 'AUDITOR'] as const;
const WRITE_ROLES = ['CRO_MANAGER', 'ADMIN'] as const;

export const resolvers = {
  Query: {
    getDocumentsByStudy: (
      _: unknown,
      args: { studyId: number; page?: number; pageSize?: number; filters?: { category?: string; status?: DocumentStatus } },
      context: GraphQLContext
    ) => {
      requireAnyRole(context, [...READ_ROLES]);
      const { page, pageSize } = parseOrThrow(paginationSchema, { page: args.page ?? 1, pageSize: args.pageSize ?? 20 });
      return documentService.getDocumentsByStudy(args.studyId, page, pageSize, args.filters ?? undefined);
    },

    getDocument: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAnyRole(context, [...READ_ROLES]);
      return documentService.getDocument(args.id);
    },
  },

  Mutation: {
    createDocument: (_: unknown, args: { studyId: number; title: string; category: string }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(createDocumentSchema, args);
      return documentService.createDocument(input.studyId, input.title, input.category);
    },

    addDocumentVersion: (_: unknown, args: { documentId: number; fileRef: string }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(addVersionSchema, args);
      return documentService.addDocumentVersion(input.documentId, input.fileRef);
    },

    setDocumentStatus: (_: unknown, args: { documentId: number; status: DocumentStatus }, context: GraphQLContext) => {
      requireAnyRole(context, [...WRITE_ROLES]);
      const input = parseOrThrow(setDocumentStatusSchema, args);
      // Only ADMIN can set ARCHIVED via this mutation
      if (input.status === 'ARCHIVED') {
        requireRole(context, 'ADMIN');
      }
      return documentService.setDocumentStatus(input.documentId, input.status);
    },

    archiveDocument: (_: unknown, args: { documentId: number }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return documentService.archiveDocument(args.documentId);
    },
  },
};
