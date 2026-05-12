import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDb, mockUser } from '../testHelpers';
import { createApp } from '../../app';
import { signToken } from '../../utils/jwt';
import type { Express } from 'express';

let app: Express;

function adminToken(): string {
  return signToken(mockUser());
}

function viewerToken(): string {
  return signToken(mockUser({ userId: 99, email: 'viewer@test.com', roles: ['MONITOR'] }));
}

function gql(query: string, variables?: Record<string, unknown>) {
  return { query, variables };
}

describe('Identity GraphQL API', () => {
  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-16-chars';
    setupTestDb();
    app = await createApp();
  });

  describe('health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.module).toBe('identity');
    });
  });

  describe('getUsers', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post('/graphql')
        .send(gql('{ getUsers { total } }'));
      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns users for authenticated user', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql('{ getUsers { total rows { id email status roles } } }'));
      expect(res.body.data.getUsers.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.getUsers.rows[0].roles).toContain('ADMIN');
    });
  });

  describe('createUser', () => {
    it('ADMIN can create a user', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "new@test.com", password: "securepass1", roles: [MONITOR] }) {
              id email status roles
            }
          }
        `));
      expect(res.body.data.createUser.email).toBe('new@test.com');
      expect(res.body.data.createUser.status).toBe('ACTIVE');
      expect(res.body.data.createUser.roles).toContain('MONITOR');
    });

    it('non-ADMIN is FORBIDDEN', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${viewerToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "x@test.com", password: "securepass1", roles: [MONITOR] }) {
              id
            }
          }
        `));
      expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('rejects duplicate email with BAD_USER_INPUT', async () => {
      // Seed admin already has admin@trialforge.io
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "admin@trialforge.io", password: "securepass1", roles: [MONITOR] }) {
              id
            }
          }
        `));
      expect(res.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(res.body.errors[0].extensions.fieldErrors.email).toBe('Email already in use');
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "not-an-email", password: "securepass1", roles: [MONITOR] }) {
              id
            }
          }
        `));
      expect(res.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(res.body.errors[0].extensions.fieldErrors.email).toBeDefined();
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "short@test.com", password: "abc", roles: [MONITOR] }) {
              id
            }
          }
        `));
      expect(res.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(res.body.errors[0].extensions.fieldErrors.password).toBeDefined();
    });
  });

  describe('updateUser — status transitions', () => {
    it('ADMIN can archive a user', async () => {
      // First create a user
      const createRes = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "archive@test.com", password: "securepass1", roles: [MONITOR] }) {
              id
            }
          }
        `));
      const userId = createRes.body.data.createUser.id;

      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation($id: Int!) {
            updateUser(id: $id, input: { status: ARCHIVED }) {
              id status
            }
          }
        `, { id: userId }));
      expect(res.body.data.updateUser.status).toBe('ARCHIVED');
    });

    it('rejects invalid status transition', async () => {
      const createRes = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "trans@test.com", password: "securepass1", roles: [MONITOR] }) {
              id
            }
          }
        `));
      const userId = createRes.body.data.createUser.id;

      // Archive first
      await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`mutation($id: Int!) { updateUser(id: $id, input: { status: ARCHIVED }) { id } }`, { id: userId }));

      // Try to reactivate — should fail
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`mutation($id: Int!) { updateUser(id: $id, input: { status: ACTIVE }) { id } }`, { id: userId }));
      expect(res.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });
  });

  describe('assignRoleToUser / unassignRoleFromUser', () => {
    it('assigns and unassigns a role', async () => {
      const createRes = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`
          mutation {
            createUser(input: { email: "roles@test.com", password: "securepass1", roles: [MONITOR] }) {
              id roles
            }
          }
        `));
      const userId = createRes.body.data.createUser.id;

      // Assign AUDITOR
      const assignRes = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`mutation($uid: Int!) { assignRoleToUser(userId: $uid, role: AUDITOR) { roles } }`, { uid: userId }));
      expect(assignRes.body.data.assignRoleToUser.roles).toContain('AUDITOR');
      expect(assignRes.body.data.assignRoleToUser.roles).toContain('MONITOR');

      // Unassign MONITOR
      const unassignRes = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql(`mutation($uid: Int!) { unassignRoleFromUser(userId: $uid, role: MONITOR) { roles } }`, { uid: userId }));
      expect(unassignRes.body.data.unassignRoleFromUser.roles).toEqual(['AUDITOR']);
    });

    it('non-ADMIN cannot assign roles', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${viewerToken()}`)
        .send(gql(`mutation { assignRoleToUser(userId: 1, role: AUDITOR) { id } }`));
      expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });
  });

  describe('me', () => {
    it('returns null when unauthenticated', async () => {
      const res = await request(app)
        .post('/graphql')
        .send(gql('{ me { id email } }'));
      expect(res.body.data.me).toBeNull();
    });

    it('returns user when authenticated', async () => {
      const res = await request(app)
        .post('/graphql')
        .set('Cookie', `auth_token=${adminToken()}`)
        .send(gql('{ me { id email roles } }'));
      expect(res.body.data.me.email).toBe('admin@trialforge.io');
    });
  });
});
