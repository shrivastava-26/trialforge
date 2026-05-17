import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as visitService from '../services/visitService';
import { requireAnyRole } from '../graphql/resolvers/helpers';
import { GraphQLContext } from '../types';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type VisitTemplate @key(fields: "id") {
    id: ID!
    studyId: ID!
    name: String!
    status: String!
  }

  type PatientVisit @key(fields: "id") {
    id: ID!
    studySubjectId: ID!
    status: String!
    scheduledDate: String!
    completedDate: String
  }

  type PatientVisitPage {
    rows: [PatientVisit!]!
    total: Int!
  }

  type StudySubject @key(fields: "id") {
    id: ID! @external
    visits(page: Int, pageSize: Int, status: String): PatientVisitPage!
  }

  type Query {
    _visitSchedulingHealth: String!
  }
`;

const resolvers = {
  Query: {
    _visitSchedulingHealth: () => 'ok',
  },
  StudySubject: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    visits(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      return visitService.getPatientVisitsFiltered(
        Number(parent.id),
        page,
        pageSize,
        args.status
      );
    },
  },
  VisitTemplate: {
    __resolveReference(ref: { id: string }) {
      // Future: look up template by ID if needed for cross-subgraph entity resolution
      return { id: ref.id };
    },
  },
  PatientVisit: {
    __resolveReference(ref: { id: string }) {
      return visitService.getPatientVisit(Number(ref.id));
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
