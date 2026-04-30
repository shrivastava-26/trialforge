import { GraphQLError } from 'graphql';
import { verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { generateRefreshToken, hashToken } from '../utils/token';
import { findUserByEmail, findUserById } from '../repositories/authRepository';
import {
  insertRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} from '../repositories/refreshTokenRepository';

/** 7-day refresh token TTL in milliseconds — must match cookie maxAge in resolver. */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function loginUser(email: string, password: string) {
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password)) {
    throw new GraphQLError('Invalid credentials', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const accessToken = signToken({ userId: user.id, role: user.role, email: user.email });
  const { rawToken, tokenHash, expiresAt } = createRefreshTokenRecord(user.id);

  return {
    accessToken,
    refreshToken: rawToken,
    refreshTokenHash: tokenHash,
    refreshExpiresAt: expiresAt,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

/**
 * Validate the incoming refresh token, rotate it, and return a new access token
 * plus a new refresh token.
 *
 * Returns null if the token is invalid, expired, or revoked — caller should
 * clear cookies and return UNAUTHENTICATED.
 */
export function refreshSession(rawRefreshToken: string): {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
} | null {
  const incomingHash = hashToken(rawRefreshToken);
  const row = findRefreshToken(incomingHash);

  if (!row) return null;
  if (row.revoked_at !== null) return null;
  if (new Date(row.expires_at) <= new Date()) return null;

  const user = findUserById(row.user_id);
  if (!user) return null;

  // Rotation: revoke old token, issue new one
  const { rawToken: newRaw, tokenHash: newHash, expiresAt: newExpiry } =
    createRefreshTokenRecord(row.user_id);

  revokeRefreshToken(incomingHash, newHash);

  const accessToken = signToken({
    userId: user.id,
    role: user.role as 'ADMIN' | 'VIEWER',
    email: user.email,
  });

  return { accessToken, refreshToken: newRaw, refreshExpiresAt: newExpiry };
}

/** Revoke the refresh token on logout. No-op if token not found. */
export function revokeSession(rawRefreshToken: string): void {
  const hash = hashToken(rawRefreshToken);
  revokeRefreshToken(hash);
}

export function getUserById(id: number) {
  return findUserById(id);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function createRefreshTokenRecord(userId: number) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  insertRefreshToken(userId, tokenHash, expiresAt);
  return { rawToken, tokenHash, expiresAt };
}
