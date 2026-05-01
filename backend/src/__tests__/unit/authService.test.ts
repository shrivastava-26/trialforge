import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupTestDb, seedUser } from '../testHelpers';
import { loginUser, refreshSession, revokeSession, REFRESH_TOKEN_TTL_MS } from '../../services/authService';
import { getDb } from '../../db/connection';
import { hashToken } from '../../utils/token';

process.env.JWT_SECRET = 'test-secret-key-for-auth-service-tests';

beforeEach(() => { setupTestDb(); });

describe('loginUser', () => {
  it('returns accessToken, refreshToken, and user on valid credentials', () => {
    seedUser('auth@test.com', 'pass123', 'ADMIN');
    const result = loginUser('auth@test.com', 'pass123');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('auth@test.com');
    expect(result.user.role).toBe('ADMIN');
  });

  it('throws UNAUTHENTICATED for unknown email', () => {
    expect(() => loginUser('nobody@test.com', 'pass')).toThrow('Invalid credentials');
  });

  it('throws UNAUTHENTICATED for wrong password', () => {
    seedUser('auth2@test.com', 'correct', 'VIEWER');
    expect(() => loginUser('auth2@test.com', 'wrong')).toThrow('Invalid credentials');
  });

  it('stores a hashed refresh token in the DB (not the raw token)', () => {
    seedUser('auth3@test.com', 'pass', 'VIEWER');
    const result = loginUser('auth3@test.com', 'pass');
    const expectedHash = hashToken(result.refreshToken);
    const row = getDb().prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(expectedHash);
    expect(row).toBeTruthy();
    // Raw token must NOT be stored
    const rawRow = getDb().prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(result.refreshToken);
    expect(rawRow).toBeUndefined();
  });

  it('sets refreshExpiresAt ~7 days in the future', () => {
    seedUser('auth4@test.com', 'pass', 'VIEWER');
    const before = Date.now();
    const result = loginUser('auth4@test.com', 'pass');
    const after = Date.now();
    const expiresMs = new Date(result.refreshExpiresAt).getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + REFRESH_TOKEN_TTL_MS - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + REFRESH_TOKEN_TTL_MS + 1000);
  });
});

describe('refreshSession', () => {
  it('returns new tokens on valid refresh token', () => {
    seedUser('ref@test.com', 'pass', 'ADMIN');
    const login = loginUser('ref@test.com', 'pass');
    const result = refreshSession(login.refreshToken);
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBeTruthy();
    expect(result!.refreshToken).toBeTruthy();
    // New refresh token must differ from old
    expect(result!.refreshToken).not.toBe(login.refreshToken);
  });

  it('revokes the old token after rotation (replaced_by_token_hash set)', () => {
    seedUser('ref2@test.com', 'pass', 'VIEWER');
    const login = loginUser('ref2@test.com', 'pass');
    const oldHash = hashToken(login.refreshToken);
    refreshSession(login.refreshToken);
    const row = getDb()
      .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
      .get(oldHash) as { revoked_at: string | null; replaced_by_token_hash: string | null } | undefined;
    expect(row?.revoked_at).not.toBeNull();
    expect(row?.replaced_by_token_hash).not.toBeNull();
  });

  it('returns null for an unknown token', () => {
    setupTestDb();
    expect(refreshSession('totally-fake-token')).toBeNull();
  });

  it('returns null for a revoked token', () => {
    seedUser('ref3@test.com', 'pass', 'VIEWER');
    const login = loginUser('ref3@test.com', 'pass');
    revokeSession(login.refreshToken);
    expect(refreshSession(login.refreshToken)).toBeNull();
  });

  it('returns null for an expired token', () => {
    seedUser('ref4@test.com', 'pass', 'VIEWER');
    const login = loginUser('ref4@test.com', 'pass');
    // Manually expire the token in DB
    const hash = hashToken(login.refreshToken);
    getDb()
      .prepare("UPDATE refresh_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token_hash = ?")
      .run(hash);
    expect(refreshSession(login.refreshToken)).toBeNull();
  });

  it('new token from rotation is usable for another refresh', () => {
    seedUser('ref5@test.com', 'pass', 'ADMIN');
    const login = loginUser('ref5@test.com', 'pass');
    const first = refreshSession(login.refreshToken);
    expect(first).not.toBeNull();
    const second = refreshSession(first!.refreshToken);
    expect(second).not.toBeNull();
    expect(second!.accessToken).toBeTruthy();
  });
});

describe('revokeSession', () => {
  it('marks the token as revoked', () => {
    seedUser('rev@test.com', 'pass', 'VIEWER');
    const login = loginUser('rev@test.com', 'pass');
    revokeSession(login.refreshToken);
    const hash = hashToken(login.refreshToken);
    const row = getDb()
      .prepare('SELECT revoked_at FROM refresh_tokens WHERE token_hash = ?')
      .get(hash) as { revoked_at: string | null } | undefined;
    expect(row?.revoked_at).not.toBeNull();
  });

  it('is a no-op for an unknown token (does not throw)', () => {
    expect(() => revokeSession('nonexistent-token')).not.toThrow();
  });
});
