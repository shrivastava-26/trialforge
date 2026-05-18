import type { JwtPayload } from "./types.js";

export function normalizeRoles(user: JwtPayload | null | undefined): string[] {
  return user?.roles ?? (user?.role ? [user.role] : []);
}
