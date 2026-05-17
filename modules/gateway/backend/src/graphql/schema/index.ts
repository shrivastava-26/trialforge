export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    role: String!
  }

  type AuthPayload {
    user: User!
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
    me: User
    getDashboardMetrics(studyId: ID, siteId: ID): DashboardMetrics!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshSession: Boolean!
  }
`;
