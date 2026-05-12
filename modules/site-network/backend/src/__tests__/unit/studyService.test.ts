import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { getDb } from '../../db/connection';
import { createStudy, updateStudy, assignSiteToStudy, unassignSiteFromStudy } from '../../services/studyService';
import { createSite, updateSite, assignExaminerToSite } from '../../services/siteService';
import { createExaminer, addExaminerCertificate } from '../../services/examinerService';

function todayUTC(): string { return new Date().toISOString().slice(0, 10); }
function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pastDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => { setupTestDb(); });

// ── createStudy ───────────────────────────────────────────────────────────────

describe('createStudy', () => {
  it('S1: always creates with status Planned', () => {
    const s = createStudy({ protocolId: 'P001', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    expect(s.status).toBe('Planned');
  });

  it('D1: rejects startDate in the past', () => {
    expect(() =>
      createStudy({ protocolId: 'P002', title: 'T', sponsor: 'S', phase: 'I', startDate: pastDate(1) })
    ).toThrow('Start date');
  });

  it('D2: rejects endDate before startDate', () => {
    expect(() =>
      createStudy({ protocolId: 'P003', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC(), endDate: pastDate(1) })
    ).toThrow('End date');
  });

  it('S8: rejects duplicate protocolId', () => {
    createStudy({ protocolId: 'P004', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    expect(() =>
      createStudy({ protocolId: 'P004', title: 'T2', sponsor: 'S', phase: 'I', startDate: todayUTC() })
    ).toThrow('Protocol ID');
  });
});

// ── updateStudy status transitions ───────────────────────────────────────────

describe('updateStudy status transitions', () => {
  function makeActiveStudy() {
    // Create study, site, examiner, cert, assign all, then activate
    const study = createStudy({ protocolId: 'P-ACT', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'E001', name: 'Alice', specialty: 'Cardiology', email: 'a@test.com', role: 'Principal Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'CERT-001', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'S001', name: 'Site A', city: 'NYC', country: 'US' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    const active = updateStudy(study.id, { status: 'Active' });
    return { study: active, site, examiner };
  }

  it('S2: rejects backward transition Active → Planned', () => {
    const { study } = makeActiveStudy();
    expect(() => updateStudy(study.id, { status: 'Planned' })).toThrow('Invalid status transition');
  });

  it('S2: rejects skipping Planned → Completed', () => {
    const s = createStudy({ protocolId: 'P-SKIP', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    expect(() => updateStudy(s.id, { status: 'Completed' })).toThrow('Invalid status transition');
  });

  it('S3: rejects Planned → Active with no sites', () => {
    const s = createStudy({ protocolId: 'P-NS', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    expect(() => updateStudy(s.id, { status: 'Active' })).toThrow('site');
  });

  it('D4: rejects Planned → Active when startDate is in the future', () => {
    const study = createStudy({ protocolId: 'P-FUT', title: 'T', sponsor: 'S', phase: 'I', startDate: futureDate(5) });
    const examiner = createExaminer({ examinerCode: 'E-FUT', name: 'Bob', specialty: 'X', email: 'b@test.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'CERT-FUT', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'S-FUT', name: 'Site B', city: 'LA', country: 'US' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    expect(() => updateStudy(study.id, { status: 'Active' })).toThrow('future start date');
  });

  it('D6: rejects Active → Completed without endDate', () => {
    const { study, site } = makeActiveStudy();
    // Close the site so D8 doesn't fire before D6
    updateSite(site.id, { status: 'Closed' });
    expect(() => updateStudy(study.id, { status: 'Completed' })).toThrow('end date');
  });

  it('D6: rejects Active → Completed with future endDate', () => {
    const { study, site } = makeActiveStudy();
    updateSite(site.id, { status: 'Closed' });
    expect(() => updateStudy(study.id, { status: 'Completed', endDate: futureDate(10) })).toThrow('future');
  });

  it('D3: rejects updating startDate to past for Planned study', () => {
    const s = createStudy({ protocolId: 'P-D3', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    expect(() => updateStudy(s.id, { startDate: pastDate(1) })).toThrow('past');
  });
});

// ── assignSiteToStudy ─────────────────────────────────────────────────────────

describe('assignSiteToStudy', () => {
  it('SI1: rejects assigning a Planned site', () => {
    const study = createStudy({ protocolId: 'P-SI1', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const site = createSite({ siteCode: 'S-SI1', name: 'Site', city: 'X', country: 'Y' });
    // site is Planned by default
    expect(() => assignSiteToStudy(study.id, site.id)).toThrow('Active');
  });
});

// ── unassignSiteFromStudy ─────────────────────────────────────────────────────

describe('unassignSiteFromStudy', () => {
  it('D9: rejects unassigning a site from an Active study', () => {
    const study = createStudy({ protocolId: 'P-D9', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'E-D9', name: 'C', specialty: 'X', email: 'c@test.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'CERT-D9', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'S-D9', name: 'Site', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    updateStudy(study.id, { status: 'Active' });
    expect(() => unassignSiteFromStudy(study.id, site.id)).toThrow('Active study');
  });
});
