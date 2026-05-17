import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { resolvers } from '../graphql/resolvers';

/**
 * Federation-compatible schema for reporting subgraph.
 * References User entity from site-network (external).
 */
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  extend type User @key(fields: "id") {
    id: ID! @external
    metrics(studyId: ID, siteId: ID): DashboardMetrics!
  }

  extend type Study @key(fields: "id") {
    id: ID! @external
    metrics(siteId: ID): DashboardMetrics!
  }

  type DashboardMetrics {
    patientsTotal: Int!
    patientsEnrolled: Int!
    patientsArchived: Int!
    visitsPlanned: Int!
    visitsCompleted: Int!
    visitsMissed: Int!
    formsActive: Int!
    formInstancesDraft: Int!
    formInstancesSubmitted: Int!
    queriesOpen: Int!
    queriesAnswered: Int!
    queriesClosed: Int!
    documentsTotal: Int!
    documentsArchived: Int!
    documentVersionsTotal: Int!
  }

  type Query {
    getDashboardMetrics(studyId: ID, siteId: ID): DashboardMetrics!
  }
`;

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});
