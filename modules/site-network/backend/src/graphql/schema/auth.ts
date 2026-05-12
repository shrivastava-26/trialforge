export const authSchema = `#graphql
  type User {
    id: ID!
    email: String!
    role: String!
  }

  type AuthPayload {
    user: User!
  }

  type Query {
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    """
    Uses the refresh_token HttpOnly cookie to issue a new access token cookie
    and rotate the refresh token. Returns true on success, false on failure.
    No auth required — the refresh cookie is the credential.
    """
    refreshSession: Boolean!
  }
`;
