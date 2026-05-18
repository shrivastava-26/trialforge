import { GraphQLError } from "graphql";

export const UNAUTHENTICATED = new GraphQLError("Not authenticated", {
  extensions: { code: "UNAUTHENTICATED" },
});

export const FORBIDDEN = new GraphQLError("Forbidden", {
  extensions: { code: "FORBIDDEN" },
});
