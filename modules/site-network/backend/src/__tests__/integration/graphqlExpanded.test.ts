import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { initConnection } from '../../db/connection';
import { initDb } from '../../db/migrate';
import { seedUser } from '../testHelpers';
import { signToken } from '../../utils/jwt';
import { loginUser } from '../../services/authService';
import { createExaminer, addExaminerCertificate } from '../../services/examinerService';
import { createSite, updateSite, assignExaminerToSite } from '../../services/siteService';
import { createStudy, assignSiteToStudy, assignExaminerToStudySite } from '../../services/studyService';

process.env.JWT_SECRET = 'test-secret-key-for-integration-tests-expanded';
process.env.NODE_ENV = 'test';

let app: Express;
let adminToken: string;
let viewerToken: string;
let adminId: number;

function today(): string { return new Date().toISOString().slice(0, 10); }
function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pastDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function gql(query: string, variables?: Record<string, unknown>) {
  return { query, variables };
}
function withCookie(token: string) { return `auth_token=${token}`; }

beforeAll(async () => {
  initConnection(':memory:');
  initDb();
  adminId = seedUser('admin@expanded.com', 'password123', 'ADMIN');
  const viewerId = seedUser('viewer@expanded.com', 'password123', 'VIEWER');
  adminToken = signToken({ userId: adminId, role: 'ADMIN', email: 'admin@expanded.com' });
  viewerToken = signToken({ userId: viewerId, role: 'VIEWER', email: 'viewer@expanded.com' });
  app = await createApp();
});

// ── RBAC ─────────────────────────────────────────────────────────────────────

describe('RBAC: VIEWER cannot call admin mutations', () => {
  it('FORBIDDEN on createSite', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`mutation { createSite(input: { siteCode: "V-SC", name: "N", city: "C", country: "US" }) { id } }`));
    expect(res.body.errors?.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'FORBIDDEN')).toBe(true);
  });

  it('FORBIDDEN on createExaminer', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`mutation { createExaminer(input: { examinerCode: "V-E", name: "N", specialty: "X", email: "v@t.com", role: "Sub-Investigator" }) { id } }`));
    expect(res.body.errors?.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'FORBIDDEN')).toBe(true);
  });

  it('FORBIDDEN on getAuditLogs', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`{ getAuditLogs { total rows { id } } }`));
    expect(res.body.errors?.some((e: { extensions?: { code?: string } }) => e.extensions?.code === 'FORBIDDEN')).toBe(true);
  });

  it('VIEWER can read studies (no error)', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`{ getStudies(page: 1, pageSize: 10) { total rows { id } } }`));
    expect(res.body.errors).toBeUndefined();
  });
});

// ── BAD_USER_INPUT validation ─────────────────────────────────────────────────

describe('BAD_USER_INPUT: Zod validation errors', () => {
  it('returns fieldErrors for empty protocolId on createStudy', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { createStudy(input: { protocolId: "", title: "", sponsor: "", phase: "I", startDate: "${today()}" }) { id } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(err).toBeDefined();
    expect(err.extensions.fieldErrors).toBeDefined();
  });

  it('returns BAD_USER_INPUT for invalid status transition via updateStudy', async () => {
    // Create a study first
    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'INT-TRANS', title: 'T', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;
    expect(studyId).toBeTruthy();

    // Try to skip to Completed (invalid)
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { updateStudy(id: "${studyId}", input: { status: "Completed" }) { id } }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(err).toBeDefined();
  });
});

// ── Admin CRUD + audit log creation ──────────────────────────────────────────

describe('Admin CRUD creates audit log entries', () => {
  it('CREATE study produces a CREATE audit log', async () => {
    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'AUDIT-S1', title: 'Audit Study', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;
    expect(studyId).toBeTruthy();

    const auditRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`query { getAuditLogs(entityType: "Study", entityId: ${studyId}) { rows { action entityType } } }`));
    const rows = auditRes.body.data?.getAuditLogs?.rows ?? [];
    expect(rows.some((r: { action: string }) => r.action === 'CREATE')).toBe(true);
  });

  it('UPDATE study produces an UPDATE audit log', async () => {
    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'AUDIT-S2', title: 'Before', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;

    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { updateStudy(id: "${studyId}", input: { title: "After" }) { id } }`));

    const auditRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`query { getAuditLogs(entityType: "Study", entityId: ${studyId}) { rows { action } } }`));
    const rows = auditRes.body.data?.getAuditLogs?.rows ?? [];
    expect(rows.some((r: { action: string }) => r.action === 'UPDATE')).toBe(true);
  });

  it('assignSiteToStudy produces an ASSIGN audit log with entityType StudySite', async () => {
    // Build via service layer (faster than full GQL chain)
    const examiner = createExaminer({ examinerCode: 'INT-E1', name: 'E', specialty: 'X', email: 'e1@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'INT-C1', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'INT-SITE1', name: 'Site', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });

    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'AUDIT-ASSIGN', title: 'T', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;

    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { assignSiteToStudy(studyId: "${studyId}", siteId: "${site.id}") }`));

    const auditRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`query { getAuditLogs(entityType: "StudySite", entityId: ${studyId}) { rows { action entityType } } }`));
    const rows = auditRes.body.data?.getAuditLogs?.rows ?? [];
    expect(rows.some((r: { action: string; entityType: string }) => r.action === 'ASSIGN' && r.entityType === 'StudySite')).toBe(true);
  });

  it('unassignSiteFromStudy produces an UNASSIGN audit log', async () => {
    const examiner = createExaminer({ examinerCode: 'INT-E2', name: 'E2', specialty: 'X', email: 'e2@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'INT-C2', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'INT-SITE2', name: 'Site2', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });

    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'AUDIT-UNASSIGN', title: 'T', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;

    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { assignSiteToStudy(studyId: "${studyId}", siteId: "${site.id}") }`));
    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { unassignSiteFromStudy(studyId: "${studyId}", siteId: "${site.id}") }`));

    const auditRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`query { getAuditLogs(entityType: "StudySite", entityId: ${studyId}) { rows { action } } }`));
    const rows = auditRes.body.data?.getAuditLogs?.rows ?? [];
    expect(rows.some((r: { action: string }) => r.action === 'UNASSIGN')).toBe(true);
  });
});

// ── Refresh token flow ────────────────────────────────────────────────────────

describe('Refresh token flow', () => {
  it('refreshSession returns true with valid refresh cookie', async () => {
    const loginResult = loginUser('admin@expanded.com', 'password123');
    const res = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${loginResult.refreshToken}`)
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.refreshSession).toBe(true);
    // New auth_token cookie should be set
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    expect(cookies.some((c: string) => c.startsWith('auth_token='))).toBe(true);
  });

  it('refreshSession returns false with no refresh cookie', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.refreshSession).toBe(false);
  });

  it('refreshSession returns false with revoked refresh token', async () => {
    const loginResult = loginUser('admin@expanded.com', 'password123');
    // Revoke via logout
    await request(app).post('/graphql')
      .set('Cookie', `auth_token=${adminToken}; refresh_token=${loginResult.refreshToken}`)
      .send(gql(`mutation { logout }`));

    const res = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${loginResult.refreshToken}`)
      .send(gql(`mutation { refreshSession }`));
    expect(res.body.data?.refreshSession).toBe(false);
  });

  it('after successful refresh, new access token allows protected query', async () => {
    const loginResult = loginUser('admin@expanded.com', 'password123');
    const refreshRes = await request(app).post('/graphql')
      .set('Cookie', `refresh_token=${loginResult.refreshToken}`)
      .send(gql(`mutation { refreshSession }`));
    expect(refreshRes.body.data?.refreshSession).toBe(true);

    // Extract new auth_token from Set-Cookie
    const cookies: string[] = refreshRes.headers['set-cookie'] ?? [];
    const authCookie = cookies.find((c: string) => c.startsWith('auth_token='));
    expect(authCookie).toBeTruthy();
    const newToken = authCookie!.split(';')[0]; // "auth_token=<value>"

    const meRes = await request(app).post('/graphql')
      .set('Cookie', newToken)
      .send(gql(`{ me { email } }`));
    expect(meRes.body.errors).toBeUndefined();
    expect(meRes.body.data?.me?.email).toBe('admin@expanded.com');
  });
});

// ── Expired cert assignment ───────────────────────────────────────────────────

describe('BAD_USER_INPUT: expired certificate assignment', () => {
  it('rejects assignExaminerToSite when examiner has only expired cert', async () => {
    const examiner = createExaminer({ examinerCode: 'EXP-E', name: 'Exp', specialty: 'X', email: 'exp@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'EXP-CERT', expiresOn: pastDate(1) });
    const site = createSite({ siteCode: 'EXP-SITE', name: 'Site', city: 'X', country: 'Y' });

    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { assignExaminerToSite(siteId: "${site.id}", examinerId: "${examiner.id}") }`));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(err).toBeDefined();
    expect(err.message).toMatch(/certificate/i);
  });
});

// ── globalSearch via GQL ──────────────────────────────────────────────────────

describe('globalSearch query', () => {
  it('returns grouped results for a keyword', async () => {
    // Seed a study with a unique keyword
    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'SRCH-001', title: 'Zephyr Trial', sponsor: 'S', phase: 'Phase I', startDate: today() } }));

    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`query { globalSearch(keyword: "zephyr") { studies { id title } sites { id } examiners { id } } }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.globalSearch?.studies?.some((s: { title: string }) => s.title === 'Zephyr Trial')).toBe(true);
  });

  it('returns empty arrays for no-match keyword', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(viewerToken))
      .send(gql(`query { globalSearch(keyword: "zzznomatch99") { studies { id } sites { id } examiners { id } } }`));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.globalSearch?.studies).toHaveLength(0);
    expect(res.body.data?.globalSearch?.sites).toHaveLength(0);
    expect(res.body.data?.globalSearch?.examiners).toHaveLength(0);
  });
});

// ── getAuditLogs entityTypes array ───────────────────────────────────────────

describe('getAuditLogs with entityTypes array', () => {
  it('returns Study + StudySite entries for a study', async () => {
    const examiner = createExaminer({ examinerCode: 'AL-E', name: 'Al', specialty: 'X', email: 'al@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'AL-C', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'AL-SITE', name: 'Site', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });

    const createRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation CreateStudy($input: CreateStudyInput!) { createStudy(input: $input) { id } }`,
        { input: { protocolId: 'AL-STUDY', title: 'T', sponsor: 'S', phase: 'Phase I', startDate: today() } }));
    const studyId = createRes.body.data?.createStudy?.id;

    await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`mutation { assignSiteToStudy(studyId: "${studyId}", siteId: "${site.id}") }`));

    const auditRes = await request(app).post('/graphql')
      .set('Cookie', withCookie(adminToken))
      .send(gql(`query { getAuditLogs(entityTypes: ["Study", "StudySite"], entityId: ${studyId}) { rows { action entityType } } }`));
    const rows = auditRes.body.data?.getAuditLogs?.rows ?? [];
    const types = rows.map((r: { entityType: string }) => r.entityType);
    expect(types).toContain('Study');
    expect(types).toContain('StudySite');
  });
});
