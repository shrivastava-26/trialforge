export const siteSchema = `#graphql
  type Site {
    id: ID!
    siteCode: String!
    name: String!
    city: String!
    country: String!
    status: String!
    studies: [Study!]!
    examiners: [Examiner!]!
  }

  type SitePage {
    rows: [Site!]!
    total: Int!
  }

  input CreateSiteInput {
    siteCode: String!
    name: String!
    city: String!
    country: String!
    status: String
  }

  input UpdateSiteInput {
    name: String
    city: String
    country: String
    status: String
  }

  extend type Query {
    getSite(id: ID!): Site
    getSites(page: Int, pageSize: Int): SitePage!
  }

  extend type Mutation {
    createSite(input: CreateSiteInput!): Site!
    updateSite(id: ID!, input: UpdateSiteInput!): Site!
    assignExaminerToSite(siteId: ID!, examinerId: ID!): Boolean!
    unassignExaminerFromSite(siteId: ID!, examinerId: ID!): Boolean!
  }
`;
