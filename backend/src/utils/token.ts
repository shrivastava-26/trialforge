import crypto from 'crypto';

/** Returns a 48-byte cryptographically random hex string (96 chars). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** SHA-256 hex digest — stored in DB instead of the raw token. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
