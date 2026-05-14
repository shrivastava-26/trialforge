export const typeDefs = `#graphql
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
