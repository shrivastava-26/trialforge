import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { getDb } from '../../db/connection';
import { globalSearch } from '../../services/searchService';

beforeEach(() => {
  setupTestDb();
  // Seed deterministic data
  const db = getDb();
  db.prepare("INSERT INTO studies (protocolId, title, sponsor, phase, startDate, status) VALUES (?,?,?,?,?,?)")
    .run('P-ALPHA', 'Alpha Trial', 'Pharma Co', 'Phase I', '2025-01-01', 'Planned');
  db.prepare("INSERT INTO studies (protocolId, title, sponsor, phase, startDate, status) VALUES (?,?,?,?,?,?)")
    .run('P-BETA', 'Beta Study', 'BioTech', 'Phase II', '2025-02-01', 'Active');
  db.prepare("INSERT INTO sites (siteCode, name, city, country, status) VALUES (?,?,?,?,?)")
    .run('SC-NYC', 'New York Site', 'New York', 'US', 'Active');
  db.prepare("INSERT INTO sites (siteCode, name, city, country, status) VALUES (?,?,?,?,?)")
    .run('SC-LON', 'London Clinic', 'London', 'UK', 'Planned');
  db.prepare("INSERT INTO examiners (examinerCode, name, specialty, email, role) VALUES (?,?,?,?,?)")
    .run('EX-001', 'Alice Smith', 'Cardiology', 'alice@test.com', 'Principal Investigator');
  db.prepare("INSERT INTO examiners (examinerCode, name, specialty, email, role) VALUES (?,?,?,?,?)")
    .run('EX-002', 'Bob Jones', 'Neurology', 'bob@test.com', 'Sub-Investigator');
});

describe('globalSearch — keyword matching', () => {
  it('finds studies by title keyword', () => {
    const r = globalSearch('alpha');
    expect(r.studies).toHaveLength(1);
    expect(r.studies[0].protocolId).toBe('P-ALPHA');
  });

  it('finds studies by sponsor keyword', () => {
    const r = globalSearch('biotech');
    expect(r.studies).toHaveLength(1);
    expect(r.studies[0].protocolId).toBe('P-BETA');
  });

  it('finds sites by name keyword', () => {
    const r = globalSearch('london');
    expect(r.sites).toHaveLength(1);
    expect(r.sites[0].siteCode).toBe('SC-LON');
  });

  it('finds examiners by name keyword', () => {
    const r = globalSearch('alice');
    expect(r.examiners).toHaveLength(1);
    expect(r.examiners[0].examinerCode).toBe('EX-001');
  });

  it('finds examiners by specialty keyword', () => {
    const r = globalSearch('neurology');
    expect(r.examiners).toHaveLength(1);
    expect(r.examiners[0].examinerCode).toBe('EX-002');
  });

  it('returns empty arrays when nothing matches', () => {
    const r = globalSearch('zzznomatch');
    expect(r.studies).toHaveLength(0);
    expect(r.sites).toHaveLength(0);
    expect(r.examiners).toHaveLength(0);
  });

  it('%% wildcard returns all entities', () => {
    const r = globalSearch('%%');
    expect(r.studies.length).toBeGreaterThanOrEqual(2);
    expect(r.sites.length).toBeGreaterThanOrEqual(2);
    expect(r.examiners.length).toBeGreaterThanOrEqual(2);
  });
});

describe('globalSearch — entityType filter', () => {
  it('returns only studies when entityType=Study', () => {
    const r = globalSearch('%%', { entityType: 'Study' });
    expect(r.studies.length).toBeGreaterThan(0);
    expect(r.sites).toHaveLength(0);
    expect(r.examiners).toHaveLength(0);
  });

  it('returns only sites when entityType=Site', () => {
    const r = globalSearch('%%', { entityType: 'Site' });
    expect(r.sites.length).toBeGreaterThan(0);
    expect(r.studies).toHaveLength(0);
    expect(r.examiners).toHaveLength(0);
  });

  it('returns only examiners when entityType=Examiner', () => {
    const r = globalSearch('%%', { entityType: 'Examiner' });
    expect(r.examiners.length).toBeGreaterThan(0);
    expect(r.studies).toHaveLength(0);
    expect(r.sites).toHaveLength(0);
  });
});

describe('globalSearch — domain filters', () => {
  it('filters studies by status', () => {
    const r = globalSearch('%%', { entityType: 'Study', studyStatus: 'Active' });
    expect(r.studies.every((s) => s.status === 'Active')).toBe(true);
    expect(r.studies.some((s) => s.protocolId === 'P-BETA')).toBe(true);
  });

  it('filters studies by phase', () => {
    const r = globalSearch('%%', { entityType: 'Study', studyPhase: 'Phase I' });
    expect(r.studies.every((s) => s.phase === 'Phase I')).toBe(true);
  });

  it('filters sites by country', () => {
    const r = globalSearch('%%', { entityType: 'Site', siteCountry: 'UK' });
    expect(r.sites.every((s) => s.country === 'UK')).toBe(true);
    expect(r.sites[0].siteCode).toBe('SC-LON');
  });

  it('filters sites by city (case-insensitive)', () => {
    const r = globalSearch('%%', { entityType: 'Site', siteCity: 'new york' });
    expect(r.sites).toHaveLength(1);
    expect(r.sites[0].siteCode).toBe('SC-NYC');
  });

  it('filters examiners by role', () => {
    const r = globalSearch('%%', { entityType: 'Examiner', examinerRole: 'Sub-Investigator' });
    expect(r.examiners.every((e) => e.role === 'Sub-Investigator')).toBe(true);
    expect(r.examiners[0].examinerCode).toBe('EX-002');
  });
});
