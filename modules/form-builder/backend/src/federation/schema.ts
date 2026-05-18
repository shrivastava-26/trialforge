import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as formService from '../services/formService';
import { requireAnyRole } from '@trialforge/shared-auth';
import { GraphQLContext } from '../types';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external", "@requires"])

  type Form @key(fields: "id") {
    id: ID!
    studyId: ID!
    name: String!
    version: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type FormPage {
    rows: [Form!]!
    total: Int!
  }

  extend type Study @key(fields: "id") {
    id: ID! @external
    forms(page: Int, pageSize: Int, status: String): FormPage!
  }

  extend type FormInstance @key(fields: "id") {
    id: ID! @external
    formId: ID! @external
    form: Form! @requires(fields: "formId")
  }

  type Query {
    _formBuilderHealth: String!
  }
`;

const resolvers = {
  Query: {
    _formBuilderHealth: () => 'ok',
  },
  Study: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    forms(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      return formService.getFormsFiltered(Number(parent.id), page, pageSize, args.status);
    },
  },
  FormInstance: {
    __resolveReference(ref: { id: string; formId: string }) {
      return { id: ref.id, formId: ref.formId };
    },
    form(parent: { formId: string }, _args: unknown, context: GraphQLContext) {
      requireAnyRole(context, [...READ_ROLES]);
      return formService.getFormById(Number(parent.formId));
    },
  },
  Form: {
    __resolveReference(ref: { id: string }) {
      return formService.getFormById(Number(ref.id));
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
