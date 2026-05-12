import { getDb } from '../db/connection';
import { RefreshTokenRow } from '../types';

export function insertRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAt: string
): void {
  getDb()
    .prepare(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`
    )
    .run(userId, tokenHash, expiresAt);
}

export function findRefreshToken(tokenHash: string): RefreshTokenRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM refresh_tokens WHERE token_hash = ?`)
      .get(tokenHash) as RefreshTokenRow | undefined) ?? null
  );
}

/**
 * Revoke a token row.
 * Pass `replacedByHash` during rotation so the chain is auditable.
 */
export function revokeRefreshToken(
  tokenHash: string,
  replacedByHash: string | null = null
): void {
  getDb()
    .prepare(
      `UPDATE refresh_tokens
       SET revoked_at = datetime('now'), replaced_by_token_hash = ?
       WHERE token_hash = ?`
    )
    .run(replacedByHash, tokenHash);
}

/** Revoke all active sessions for a user (e.g. password change, security event). */
export function revokeAllUserRefreshTokens(userId: number): void {
  getDb()
    .prepare(
      `UPDATE refresh_tokens
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`
    )
    .run(userId);
}
