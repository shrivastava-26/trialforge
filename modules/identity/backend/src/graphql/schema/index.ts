export const typeDefs = `#graphql
  enum UserStatus {
    ACTIVE
    INACTIVE
    ARCHIVED
  }

  enum RoleName {
    ADMIN
    CRO_MANAGER
    SITE_COORDINATOR
    DATA_MANAGER
    MONITOR
    AUDITOR
  }

  type User {
    id: Int!
    email: String!
    status: UserStatus!
    roles: [RoleName!]!
    createdAt: String!
    updatedAt: String!
  }

  type UserPage {
    rows: [User!]!
    total: Int!
  }

  input CreateUserInput {
    email: String!
    password: String!
    roles: [RoleName!]!
  }

  input UpdateUserInput {
    status: UserStatus
    password: String
    roles: [RoleName!]
  }

  type Query {
    getUsers(page: Int, pageSize: Int): UserPage!
    getUser(id: Int!): User!
    me: User
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: Int!, input: UpdateUserInput!): User!
    assignRoleToUser(userId: Int!, role: RoleName!): User!
    unassignRoleFromUser(userId: Int!, role: RoleName!): User!
  }
`;
