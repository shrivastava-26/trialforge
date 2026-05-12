import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { initConnection } from '../../db/connection';
import { initDb } from '../../db/migrate';
import { seedUser } from '../testHelpers';

process.env.JWT_SECRET = 'test-secret-key-for-refresh-integration';
process.env.NODE_ENV = 'test';

let app: Express;

beforeAll(async () => {
  initConnection(':memory:');
  initDb();
  seedUser('refresh@test.com', 'password123', 'ADMIN');
  seedUser('viewer-r@test.com', 'password123', 'VIEWER');
  app = await createApp();
});

function gql(query: string, variables?: Record<string, unknown>) {
  return { query, variables };
}

function extractCookie(headers: Record<string, string | string[]>, name: string): string | null {
  const cookies: string[] = Array.isArray(headers['set-cookie'])
    ? headers['set-cookie']
    : headers['set-cookie'] ? [headers['set-cookie']] : [];
  const match = cookies.find((c: string) => c.startsWith(`${name}=`));
  if (!match) return null;
  return match.split(';')[0].split('=').slice(1).join('=');
}

describe('Auth: login via GraphQL', () => {
  it('returns user and sets auth_token + refresh_token cookies on success', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "refresh@test.com", password: "password123") { user { email role } } }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.login?.user?.email).toBe('refresh@test.com');
    expect(res.body.data?.login?.user?.role).toBe('ADMIN');
    expect(extractCookie(res.headers, 'auth_token')).toBeTruthy();
    expect(extractCookie(res.headers, 'refresh_token')).toBeTruthy();
  });

  it('returns UNAUTHENTICATED for wrong password', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "refresh@test.com", password: "wrong") { user { email } } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED');
    expect(err).toBeDefined();
  });

  it('returns UNAUTHENTICATED for non-existent email', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "nobody@test.com", password: "password123") { user { email } } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED');
    expect(err).toBeDefined();
  });

  it('returns BAD_USER_INPUT for empty email', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "", password: "password123") { user { email } } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(err).toBeDefined();
  });
});

describe('Auth: refreshSession flow', () => {
  let refreshToken: string;
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "refresh@test.com", password: "password123") { user { email } } }`));
    refreshToken = extractCookie(res.headers, 'refresh_token')!;
    authToken = extractCookie(res.headers, 'auth_token')!;
    expect(refreshToken).toBeTruthy();
    expect(authToken).toBeTruthy();
  });

  it('refreshSession returns true and sets new auth_token with valid refresh cookie', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.refreshSession).toBe(true);
    const newAuth = extractCookie(res.headers, 'auth_token');
    expect(newAuth).toBeTruthy();
    // Also rotates refresh token
    const newRefresh = extractCookie(res.headers, 'refresh_token');
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(refreshToken); // rotated
  });

  it('refreshSession returns false with no refresh cookie', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.refreshSession).toBe(false);
  });

  it('refreshSession returns false after token is revoked via logout', async () => {
    // Login fresh to get a new token pair
    const loginRes = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "refresh@test.com", password: "password123") { user { email } } }`));
    const rt = extractCookie(loginRes.headers, 'refresh_token')!;
    const at = extractCookie(loginRes.headers, 'auth_token')!;

    // Logout revokes the refresh token
    await request(app).post('/graphql')
      .set('Cookie', `auth_token=${at}; refresh_token=${rt}`)
      .send(gql(`mutation { logout }`));

    // Try to use the revoked refresh token
    const res = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${rt}`)
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.data?.refreshSession).toBe(false);
  });

  it('refreshSession returns false with garbage token', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', 'refresh_token=totally-invalid-garbage-token')
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.data?.refreshSession).toBe(false);
  });

  it('new access token from refresh allows protected query (me)', async () => {
    // Login fresh
    const loginRes = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "viewer-r@test.com", password: "password123") { user { email } } }`));
    const rt = extractCookie(loginRes.headers, 'refresh_token')!;

    // Refresh to get new access token
    const refreshRes = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${rt}`)
      .send(gql(`mutation { refreshSession }`));
    const newAuth = extractCookie(refreshRes.headers, 'auth_token')!;

    // Use new access token for protected query
    const meRes = await request(app).post('/graphql')
      .set('Cookie', `auth_token=${newAuth}`)
      .send(gql(`{ me { email role } }`));
    expect(meRes.body.errors).toBeUndefined();
    expect(meRes.body.data?.me?.email).toBe('viewer-r@test.com');
    expect(meRes.body.data?.me?.role).toBe('VIEWER');
  });

  it('old refresh token is rejected after rotation (replay attack)', async () => {
    // Login fresh
    const loginRes = await request(app).post('/graphql')
      .send(gql(`mutation { login(email: "refresh@test.com", password: "password123") { user { email } } }`));
    const rt1 = extractCookie(loginRes.headers, 'refresh_token')!;

    // First refresh — succeeds and rotates
    const r1 = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${rt1}`)
      .send(gql(`mutation { refreshSession }`));
    expect(r1.body.data?.refreshSession).toBe(true);

    // Replay old token — should fail (revoked)
    const r2 = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${rt1}`)
      .send(gql(`mutation { refreshSession }`));
    expect(r2.body.data?.refreshSession).toBe(false);
  });
});

describe('Auth: UNAUTHENTICATED on protected queries without token', () => {
  it('me query without auth_token returns UNAUTHENTICATED', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`{ me { email } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED');
    expect(err).toBeDefined();
  });

  it('getStudies without auth_token returns UNAUTHENTICATED', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`{ getStudies(page: 1, pageSize: 10) { total } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED');
    expect(err).toBeDefined();
  });
});
