import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as documentService from '../services/documentService';
import * as versionRepo from '../repositories/versionRepository';
import { requireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext } from '../types';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type Document @key(fields: "id") {
    id: ID!
    studyId: ID!
    title: String!
    category: String!
    status: String!
    createdAt: String!
    updatedAt: String!
    versions: [DocumentVersion!]!
  }

  type DocumentVersion @key(fields: "id") {
    id: ID!
    documentId: ID!
    versionNumber: Int!
    fileRef: String!
    status: String!
    uploadedAt: String!
  }

  type DocumentPage {
    rows: [Document!]!
    total: Int!
  }

  extend type Study @key(fields: "id") {
    id: ID! @external
    documents(page: Int, pageSize: Int, status: String): DocumentPage!
  }

  type Query {
    _documentManagementHealth: String!
  }
`;

const resolvers = {
  Query: {
    _documentManagementHealth: () => 'ok',
  },
  Study: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    documents(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      const { rows, total } = documentService.getDocumentsByStudy(
        Number(parent.id),
        page,
        pageSize,
        args.status ? { status: args.status as any } : undefined
      );
      return { rows, total };
    },
  },
  Document: {
    __resolveReference(ref: { id: string }, context: GraphQLContext) {
      requireAnyRole(context, [...READ_ROLES]);
      return documentService.getDocument(Number(ref.id));
    },
    versions(parent: { id: string | number }) {
      const rows = versionRepo.findByDocumentId(Number(parent.id));
      return rows.map((r) => ({
        id: r.id,
        documentId: r.document_id,
        versionNumber: r.version_number,
        fileRef: r.file_ref,
        status: r.status,
        uploadedAt: r.created_at,
      }));
    },
  },
  DocumentVersion: {
    __resolveReference(ref: { id: string }) {
      return ref;
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
