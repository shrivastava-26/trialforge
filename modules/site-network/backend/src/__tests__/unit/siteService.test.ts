import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { createSite, updateSite, assignExaminerToSite, unassignExaminerFromSite } from '../../services/siteService';
import { createExaminer, addExaminerCertificate } from '../../services/examinerService';
import { findSiteById } from '../../repositories/siteRepository';

function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => { setupTestDb(); });

function makeExaminerWithCert(code: string) {
  const e = createExaminer({ examinerCode: code, name: 'Test', specialty: 'X', email: `${code}@test.com`, role: 'Sub-Investigator' });
  addExaminerCertificate(e.id, { certificateId: `CERT-${code}`, expiresOn: futureDate(365) });
  return e;
}

describe('createSite', () => {
  it('P3: always creates with status Planned', () => {
    const s = createSite({ siteCode: 'SC01', name: 'Site', city: 'X', country: 'Y' });
    expect(s.status).toBe('Planned');
  });
});

describe('updateSite', () => {
  it('P1: rejects setting Active with no examiners', () => {
    const s = createSite({ siteCode: 'SC02', name: 'Site', city: 'X', country: 'Y' });
    expect(() => updateSite(s.id, { status: 'Active' })).toThrow('examiner');
  });

  it('P1: allows setting Active when examiner is assigned', () => {
    const s = createSite({ siteCode: 'SC03', name: 'Site', city: 'X', country: 'Y' });
    const e = makeExaminerWithCert('E-P1');
    assignExaminerToSite(s.id, e.id);
    const updated = updateSite(s.id, { status: 'Active' });
    expect(updated.status).toBe('Active');
  });
});

describe('assignExaminerToSite', () => {
  it('SI3: rejects assigning to a Closed site', () => {
    const s = createSite({ siteCode: 'SC04', name: 'Site', city: 'X', country: 'Y' });
    const e = makeExaminerWithCert('E-SI3a');
    assignExaminerToSite(s.id, e.id);
    updateSite(s.id, { status: 'Active' });
    updateSite(s.id, { status: 'Closed' });
    const e2 = makeExaminerWithCert('E-SI3b');
    expect(() => assignExaminerToSite(s.id, e2.id)).toThrow('Closed');
  });

  it('SI6: rejects assigning examiner with no valid certificate', () => {
    const s = createSite({ siteCode: 'SC05', name: 'Site', city: 'X', country: 'Y' });
    const e = createExaminer({ examinerCode: 'E-SI6', name: 'NoCert', specialty: 'X', email: 'nc@test.com', role: 'Sub-Investigator' });
    expect(() => assignExaminerToSite(s.id, e.id)).toThrow('certificate');
  });
});

describe('unassignExaminerFromSite', () => {
  it('P2: auto-downgrades Active site to Planned when last examiner is removed', () => {
    const s = createSite({ siteCode: 'SC06', name: 'Site', city: 'X', country: 'Y' });
    const e = makeExaminerWithCert('E-P2');
    assignExaminerToSite(s.id, e.id);
    updateSite(s.id, { status: 'Active' });
    unassignExaminerFromSite(s.id, e.id);
    const updated = findSiteById(s.id);
    expect(updated!.status).toBe('Planned');
  });
});
