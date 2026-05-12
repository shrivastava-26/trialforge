import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { initConnection } from '../../db/connection';
import { initDb } from '../../db/migrate';
import { seedUser } from '../testHelpers';
import { signToken } from '../../utils/jwt';
import { createStudy } from '../../services/studyService';
import { createSite } from '../../services/siteService';
import { createExaminer } from '../../services/examinerService';

process.env.JWT_SECRET = 'test-secret-key-for-search-integration';
process.env.NODE_ENV = 'test';

let app: Express;
let authToken: string;

function gql(query: string, variables?: Record<string, unknown>) {
  return { query, variables };
}
function withCookie(token: string) { return `auth_token=${token}`; }
function today(): string { return new Date().toISOString().slice(0, 10); }

beforeAll(async () => {
  initConnection(':memory:');
  initDb();
  const adminId = seedUser('search-admin@test.com', 'password123', 'ADMIN');
  authToken = signToken({ userId: adminId, role: 'ADMIN', email: 'search-admin@test.com' });
  app = await createApp();

  // Seed data for search
  createStudy({ protocolId: 'SRCH-ALPHA', title: 'Alpha Cardiology Trial', sponsor: 'PharmaCo', phase: 'Phase I', startDate: today() });
  createStudy({ protocolId: 'SRCH-BETA', title: 'Beta Oncology Study', sponsor: 'BioGen', phase: 'Phase III', startDate: today() });
  createSite({ siteCode: 'SRCH-S1', name: 'London Heart Center', city: 'London', country: 'UK' });
  createSite({ siteCode: 'SRCH-S2', name: 'Tokyo Research Lab', city: 'Tokyo', country: 'Japan' });
  createExaminer({ examinerCode: 'SRCH-E1', name: 'Dr. Alpha Smith', specialty: 'Cardiology', email: 'alpha@t.com', role: 'Principal Investigator' });
  createExaminer({ examinerCode: 'SRCH-E2', name: 'Dr. Beta Jones', specialty: 'Oncology', email: 'beta@t.com', role: 'Sub-Investigator' });
});

const SEARCH_QUERY = `
  query GlobalSearch($keyword: String!, $filters: SearchFilters) {
    globalSearch(keyword: $keyword, filters: $filters) {
      studies { id protocolId title sponsor phase status }
      sites { id siteCode name city country status }
      examiners { id examinerCode name specialty role }
    }
  }
`;

describe('globalSearch: keyword matching', () => {
  it('returns studies matching keyword in title', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'alpha' }));
    expect(res.body.errors).toBeUndefined();
    const { studies, examiners } = res.body.data.globalSearch;
    expect(studies.some((s: { title: string }) => s.title.includes('Alpha'))).toBe(true);
    expect(examiners.some((e: { name: string }) => e.name.includes('Alpha'))).toBe(true);
  });

  it('returns sites matching keyword in city', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'london' }));
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.globalSearch.sites.some((s: { city: string }) => s.city === 'London')).toBe(true);
  });

  it('returns empty arrays for no-match keyword', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'zzznomatch99' }));
    expect(res.body.errors).toBeUndefined();
    const { studies, sites, examiners } = res.body.data.globalSearch;
    expect(studies).toHaveLength(0);
    expect(sites).toHaveLength(0);
    expect(examiners).toHaveLength(0);
  });
});

describe('globalSearch: keyword validation', () => {
  it('rejects keyword shorter than 2 characters', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'a' }));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'BAD_USER_INPUT');
    expect(err).toBeDefined();
  });

  it('accepts %% as filter-only search (2 chars)', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: '%%', filters: { entityType: 'Study', studyPhase: 'Phase I' } }));
    expect(res.body.errors).toBeUndefined();
    const { studies } = res.body.data.globalSearch;
    expect(studies.every((s: { phase: string }) => s.phase === 'Phase I')).toBe(true);
  });
});

describe('globalSearch: entityType filter', () => {
  it('returns only studies when entityType=Study', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'alpha', filters: { entityType: 'Study' } }));
    expect(res.body.errors).toBeUndefined();
    const { studies, sites, examiners } = res.body.data.globalSearch;
    expect(studies.length).toBeGreaterThan(0);
    expect(sites).toHaveLength(0);
    expect(examiners).toHaveLength(0);
  });

  it('returns only examiners when entityType=Examiner', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'alpha', filters: { entityType: 'Examiner' } }));
    expect(res.body.errors).toBeUndefined();
    const { studies, sites, examiners } = res.body.data.globalSearch;
    expect(studies).toHaveLength(0);
    expect(sites).toHaveLength(0);
    expect(examiners.length).toBeGreaterThan(0);
  });

  it('returns only sites when entityType=Site', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: 'tokyo', filters: { entityType: 'Site' } }));
    expect(res.body.errors).toBeUndefined();
    const { studies, sites, examiners } = res.body.data.globalSearch;
    expect(studies).toHaveLength(0);
    expect(sites.length).toBeGreaterThan(0);
    expect(examiners).toHaveLength(0);
  });
});

describe('globalSearch: domain filters', () => {
  it('filters studies by phase', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: '%%', filters: { entityType: 'Study', studyPhase: 'Phase III' } }));
    expect(res.body.errors).toBeUndefined();
    const { studies } = res.body.data.globalSearch;
    expect(studies.length).toBeGreaterThan(0);
    expect(studies.every((s: { phase: string }) => s.phase === 'Phase III')).toBe(true);
  });

  it('filters examiners by role', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: '%%', filters: { entityType: 'Examiner', examinerRole: 'Sub-Investigator' } }));
    expect(res.body.errors).toBeUndefined();
    const { examiners } = res.body.data.globalSearch;
    expect(examiners.length).toBeGreaterThan(0);
    expect(examiners.every((e: { role: string }) => e.role === 'Sub-Investigator')).toBe(true);
  });

  it('filters sites by country', async () => {
    const res = await request(app).post('/graphql')
      .set('Cookie', withCookie(authToken))
      .send(gql(SEARCH_QUERY, { keyword: '%%', filters: { entityType: 'Site', siteCountry: 'Japan' } }));
    expect(res.body.errors).toBeUndefined();
    const { sites } = res.body.data.globalSearch;
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.every((s: { country: string }) => s.country === 'Japan')).toBe(true);
  });
});

describe('globalSearch: auth required', () => {
  it('returns UNAUTHENTICATED without token', async () => {
    const res = await request(app).post('/graphql')
      .send(gql(SEARCH_QUERY, { keyword: 'alpha' }));
    const err = res.body.errors?.find((e: { extensions?: { code?: string } }) => e.extensions?.code === 'UNAUTHENTICATED');
    expect(err).toBeDefined();
  });
});
