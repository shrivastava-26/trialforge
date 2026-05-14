export const typeDefs = `#graphql
  enum QueryStatus {
    OPEN
    ANSWERED
    CLOSED
    ARCHIVED
  }

  enum MessageAuthorRole {
    DATA_MANAGER
    SITE_COORDINATOR
    ADMIN
  }

  type Query {
    id: Int!
    formInstanceId: Int!
    title: String!
    description: String!
    status: QueryStatus!
    createdAt: String!
    updatedAt: String!
  }

  type QueryMessage {
    id: Int!
    queryId: Int!
    message: String!
    authorRole: MessageAuthorRole!
    createdAt: String!
  }

  type QueryWithMessages {
    id: Int!
    formInstanceId: Int!
    title: String!
    description: String!
    status: QueryStatus!
    createdAt: String!
    updatedAt: String!
    messages: [QueryMessage!]!
  }

  type QueryPage {
    rows: [Query!]!
    total: Int!
  }

  input CreateQueryInput {
    title: String!
    description: String!
    message: String!
  }

  type RootQuery {
    getQueriesByFormInstance(formInstanceId: Int!, page: Int, pageSize: Int): QueryPage!
    getQuery(id: Int!): QueryWithMessages!
  }

  type Mutation {
    createQuery(formInstanceId: Int!, input: CreateQueryInput!): QueryWithMessages!
    postQueryMessage(queryId: Int!, message: String!): QueryWithMessages!
    closeQuery(queryId: Int!): Query!
    reopenQuery(queryId: Int!): Query!
    archiveQuery(queryId: Int!): Query!
  }

  schema {
    query: RootQuery
    mutation: Mutation
  }
`;
