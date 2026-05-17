import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as queryService from '../services/queryService';
import { requireAnyRole } from '../graphql/resolvers/helpers';
import { GraphQLContext } from '../types';

const READ_ROLES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'AUDITOR'] as const;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type TfQuery @key(fields: "id") {
    id: ID!
    formInstanceId: ID!
    title: String!
    description: String!
    status: String!
    createdAt: String!
    updatedAt: String!
    messages(page: Int, pageSize: Int): QueryMessagePage!
  }

  type QueryMessage @key(fields: "id") {
    id: ID!
    queryId: ID!
    message: String!
    authorRole: String!
    createdAt: String!
  }

  type QueryPage {
    rows: [TfQuery!]!
    total: Int!
  }

  type QueryMessagePage {
    rows: [QueryMessage!]!
    total: Int!
  }

  extend type FormInstance @key(fields: "id") {
    id: ID! @external
    queries(page: Int, pageSize: Int, status: String): QueryPage!
  }

  type Query {
    _queryManagementHealth: String!
  }
`;

const resolvers = {
  Query: {
    _queryManagementHealth: () => 'ok',
  },
  FormInstance: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    queries(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      return queryService.getQueriesByFormInstanceFiltered(
        Number(parent.id),
        page,
        pageSize,
        args.status
      );
    },
  },
  TfQuery: {
    __resolveReference(ref: { id: string }, context: GraphQLContext) {
      requireAnyRole(context, [...READ_ROLES]);
      const q = queryService.getQuery(Number(ref.id));
      return q;
    },
    messages(
      parent: { id: string },
      args: { page?: number; pageSize?: number },
      context: GraphQLContext
    ) {
      requireAnyRole(context, [...READ_ROLES]);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 50;
      return queryService.getMessagesByQueryId(Number(parent.id), page, pageSize);
    },
  },
  QueryMessage: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
