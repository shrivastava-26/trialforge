import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as edcService from '../services/edcService';
import { requireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext } from '../types';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type FormInstance @key(fields: "id") {
    id: ID!
    patientVisitId: ID!
    formId: ID!
    status: String!
    createdAt: String!
    updatedAt: String!
    submittedAt: String
  }

  type FormInstancePage {
    rows: [FormInstance!]!
    total: Int!
  }

  extend type PatientVisit @key(fields: "id") {
    id: ID! @external
    formInstances(page: Int, pageSize: Int, status: String): FormInstancePage!
  }

  type Query {
    _edcHealth: String!
  }
`;

const resolvers = {
  Query: {
    _edcHealth: () => 'ok',
  },
  PatientVisit: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    formInstances(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      return edcService.getFormInstancesFiltered(
        Number(parent.id),
        page,
        pageSize,
        args.status
      );
    },
  },
  FormInstance: {
    __resolveReference(ref: { id: string }) {
      const instance = edcService.getFormInstance(Number(ref.id));
      return instance;
    },
    submittedAt(parent: edcService.FormInstance & { response?: { submittedAt: string | null } | null }) {
      // submittedAt lives on the response; for metadata-only we pull from the instance's response
      if ('response' in parent && parent.response) {
        return parent.response.submittedAt ?? null;
      }
      return null;
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
