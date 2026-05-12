export const auditSchema = `#graphql
  type AuditLog {
    id: ID!
    actorUserId: Int!
    actorEmail: String!
    action: String!
    entityType: String!
    entityId: Int!
    beforeJson: String
    afterJson: String
    createdAt: String!
  }

  type AuditLogPage {
    rows: [AuditLog!]!
    total: Int!
  }

  extend type Query {
    getAuditLogs(
      entityType: String
      entityTypes: [String!]
      entityId: Int
      page: Int
      pageSize: Int
    ): AuditLogPage!
  }
`;
