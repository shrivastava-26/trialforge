import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { getDb } from '../../db/connection';
import {
  insertRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../../repositories/refreshTokenRepository';

beforeEach(() => { setupTestDb(); });

function insertUser(email: string): number {
  const r = getDb()
    .prepare("INSERT INTO users (email, password, role) VALUES (?, 'x', 'VIEWER')")
    .run(email);
  return r.lastInsertRowid as number;
}

function futureISO(ms = 7 * 24 * 60 * 60 * 1000): string {
  return new Date(Date.now() + ms).toISOString();
}

describe('insertRefreshToken / findRefreshToken', () => {
  it('inserts and retrieves a token by hash', () => {
    const uid = insertUser('rt1@test.com');
    insertRefreshToken(uid, 'hash-abc', futureISO());
    const row = findRefreshToken('hash-abc');
    expect(row).not.toBeNull();
    expect(row!.user_id).toBe(uid);
    expect(row!.revoked_at).toBeNull();
    expect(row!.replaced_by_token_hash).toBeNull();
  });

  it('returns null for unknown hash', () => {
    expect(findRefreshToken('no-such-hash')).toBeNull();
  });
});

describe('revokeRefreshToken', () => {
  it('sets revoked_at and leaves replaced_by_token_hash null when no replacement', () => {
    const uid = insertUser('rt2@test.com');
    insertRefreshToken(uid, 'hash-revoke', futureISO());
    revokeRefreshToken('hash-revoke');
    const row = findRefreshToken('hash-revoke');
    expect(row!.revoked_at).not.toBeNull();
    expect(row!.replaced_by_token_hash).toBeNull();
  });

  it('sets replaced_by_token_hash during rotation', () => {
    const uid = insertUser('rt3@test.com');
    insertRefreshToken(uid, 'hash-old', futureISO());
    revokeRefreshToken('hash-old', 'hash-new');
    const row = findRefreshToken('hash-old');
    expect(row!.revoked_at).not.toBeNull();
    expect(row!.replaced_by_token_hash).toBe('hash-new');
  });

  it('is a no-op for unknown hash (does not throw)', () => {
    expect(() => revokeRefreshToken('ghost-hash')).not.toThrow();
  });
});

describe('revokeAllUserRefreshTokens', () => {
  it('revokes all active tokens for a user', () => {
    const uid = insertUser('rt4@test.com');
    insertRefreshToken(uid, 'hash-a', futureISO());
    insertRefreshToken(uid, 'hash-b', futureISO());
    revokeAllUserRefreshTokens(uid);
    expect(findRefreshToken('hash-a')!.revoked_at).not.toBeNull();
    expect(findRefreshToken('hash-b')!.revoked_at).not.toBeNull();
  });

  it('does not revoke tokens belonging to a different user', () => {
    const uid1 = insertUser('rt5a@test.com');
    const uid2 = insertUser('rt5b@test.com');
    insertRefreshToken(uid1, 'hash-u1', futureISO());
    insertRefreshToken(uid2, 'hash-u2', futureISO());
    revokeAllUserRefreshTokens(uid1);
    expect(findRefreshToken('hash-u2')!.revoked_at).toBeNull();
  });

  it('does not re-revoke already-revoked tokens (idempotent)', () => {
    const uid = insertUser('rt6@test.com');
    insertRefreshToken(uid, 'hash-already', futureISO());
    revokeRefreshToken('hash-already');
    const firstRevoke = findRefreshToken('hash-already')!.revoked_at;
    revokeAllUserRefreshTokens(uid);
    // revoked_at should not change (WHERE revoked_at IS NULL guard)
    expect(findRefreshToken('hash-already')!.revoked_at).toBe(firstRevoke);
  });
});
