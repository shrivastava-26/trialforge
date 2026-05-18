import { GraphQLError } from "graphql";
import { normalizeRoles } from "./jwt.js";
import type { JwtPayload } from "./types.js";

export interface AuthContext {
  user?: JwtPayload | null;
}

export function requireAuth(ctx: AuthContext): JwtPayload {
  if (!ctx.user) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.user;
}

export function requireAnyRole(ctx: AuthContext, allowedRoles: string[]): JwtPayload {
  const user = requireAuth(ctx);
  const userRoles = normalizeRoles(user);
  const hasRole = allowedRoles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    throw new GraphQLError("Forbidden", {
      extensions: { code: "FORBIDDEN" },
    });
  }
  return user;
}
