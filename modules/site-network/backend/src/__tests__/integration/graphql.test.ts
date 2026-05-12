import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { initConnection } from '../../db/connection';
import { initDb } from '../../db/migrate';
import { seedUser } from '../testHelpers';
import { signToken } from '../../utils/jwt';

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
process.env.NODE_ENV = 'test';

let app: Express;
let adminToken: string;
let viewerToken: string;

beforeAll(async () => {
  initConnection(':memory:');
  initDb();

  const adminId = seedUser('testadmin@int.com', 'password123', 'ADMIN');
  const viewerId = seedUser('testviewer@int.com', 'password123', 'VIEWER');

  adminToken = signToken({ userId: adminId, role: 'ADMIN', email: 'testadmin@int.com' });
  viewerToken = signToken({ userId: viewerId, role: 'VIEWER', email: 'testviewer@int.com' });

  app = await createApp();
});

function gql(query: string, variables?: Record<string, unknown>) {
  return { query, variables };
}

function withCookie(token: string) {
  return `auth_token=${token}`;
}

// ── VIEWER cannot mutate ──────────────────────────────────────────────────────

describe('RBAC: VIEWER cannot run mutations', () => {
  it('returns FORBIDDEN when VIEWER calls createStudy', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`
        mutation {
          createStudy(input: {
            protocolId: "P-VIEWER"
            title: "Test"
            sponsor: "S"
            phase: "I"
            startDate: "${new Date().toISOString().slice(0, 10)}"
          }) { id }
        }
      `));

    expect(res.status).toBe(200);
    const errors = res.body.errors ?? [];
    expect(errors.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'FORBIDDEN')).toBe(true);
  });
});

// ── ADMIN can create study ────────────────────────────────────────────────────

describe('ADMIN: createStudy', () => {
  it('creates a study and returns it with status Planned', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`
        mutation CreateStudy($input: CreateStudyInput!) {
          createStudy(input: $input) { id protocolId status }
        }
      `, { input: { protocolId: 'P-INT-001', title: 'Integration Study', sponsor: 'ACME', phase: 'Phase II', startDate: today } }));

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createStudy.status).toBe('Planned');
    expect(res.body.data.createStudy.protocolId).toBe('P-INT-001');
  });

  it('returns BAD_USER_INPUT with fieldErrors for missing required fields', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`
        mutation {
          createStudy(input: {
            protocolId: ""
            title: ""
            sponsor: ""
            phase: "I"
            startDate: "${new Date().toISOString().slice(0, 10)}"
          }) { id }
        }
      `));

    expect(res.status).toBe(200);
    const errors = res.body.errors ?? [];
    const badInput = errors.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(badInput).toBeDefined();
    expect(badInput.extensions.fieldErrors).toBeDefined();
  });
});

// ── Unauthenticated request ───────────────────────────────────────────────────

describe('Auth: unauthenticated request', () => {
  it('returns UNAUTHENTICATED for protected query without cookie', async () => {
    const res = await request(app)
      .post('/graphql')
      .send(gql('{ me { id email } }'));

    expect(res.status).toBe(200);
    const errors = res.body.errors ?? [];
    expect(errors.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED')).toBe(true);
  });
});

// ── Health check ──────────────────────────────────────────────────────────────

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
