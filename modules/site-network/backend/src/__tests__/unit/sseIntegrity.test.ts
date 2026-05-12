import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import { getDb } from '../../db/connection';
import { createStudy, updateStudy, assignSiteToStudy, assignExaminerToStudySite, unassignExaminerFromStudySite, unassignSiteFromStudy } from '../../services/studyService';
import { createSite, updateSite, assignExaminerToSite } from '../../services/siteService';
import { createExaminer, addExaminerCertificate } from '../../services/examinerService';

function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayUTC(): string { return new Date().toISOString().slice(0, 10); }

beforeEach(() => { setupTestDb(); });

/** Build a fully-wired study+site+examiner+cert and return all IDs. */
function makeActiveStudyWithSSE() {
  const study = createStudy({ protocolId: 'SSE-S', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
  const examiner = createExaminer({ examinerCode: 'SSE-E', name: 'Eve', specialty: 'X', email: 'e@t.com', role: 'Sub-Investigator' });
  const cert = addExaminerCertificate(examiner.id, { certificateId: 'SSE-CERT', expiresOn: futureDate(365) });
  const site = createSite({ siteCode: 'SSE-SITE', name: 'Site', city: 'X', country: 'Y' });
  assignExaminerToSite(site.id, examiner.id);
  updateSite(site.id, { status: 'Active' });
  assignSiteToStudy(study.id, site.id);
  return { study, site, examiner, cert };
}

describe('SSE prerequisites (SI5)', () => {
  it('SI5a: rejects SSE assign when site not in study_sites', () => {
    const study = createStudy({ protocolId: 'SI5A', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'SI5A-E', name: 'A', specialty: 'X', email: 'a@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'SI5A-C', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'SI5A-S', name: 'Site', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });
    // site NOT assigned to study
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id)).toThrow('not assigned to this study');
  });

  it('SI5c: rejects SSE assign when examiner not in site_examiners', () => {
    const study = createStudy({ protocolId: 'SI5C', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'SI5C-E', name: 'B', specialty: 'X', email: 'b@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'SI5C-C', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'SI5C-S', name: 'Site', city: 'X', country: 'Y' });
    // Make site active with a different examiner so it can be assigned to study
    const other = createExaminer({ examinerCode: 'SI5C-O', name: 'Other', specialty: 'X', email: 'o@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(other.id, { certificateId: 'SI5C-OC', expiresOn: futureDate(365) });
    assignExaminerToSite(site.id, other.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    // examiner NOT assigned to site
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id)).toThrow('not assigned to this site');
  });

  it('SI7: rejects SSE assign with expired explicit certificate', () => {
    const { study, site, examiner } = makeActiveStudyWithSSE();
    // Add an expired cert
    const expiredCert = addExaminerCertificate(examiner.id, { certificateId: 'EXPIRED-C', expiresOn: '2000-01-01' });
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id, expiredCert.id)).toThrow('expired');
  });

  it('SI7: rejects SSE assign when examiner has no valid certificate', () => {
    const study = createStudy({ protocolId: 'SI7-NV', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'SI7-E', name: 'C', specialty: 'X', email: 'c@t.com', role: 'Sub-Investigator' });
    // Only expired cert
    addExaminerCertificate(examiner.id, { certificateId: 'SI7-EXP', expiresOn: '2000-01-01' });
    const site = createSite({ siteCode: 'SI7-S', name: 'Site', city: 'X', country: 'Y' });
    // Need a valid-cert examiner to activate site
    const valid = createExaminer({ examinerCode: 'SI7-V', name: 'Valid', specialty: 'X', email: 'v@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(valid.id, { certificateId: 'SI7-VC', expiresOn: futureDate(365) });
    assignExaminerToSite(site.id, valid.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    // Bypass SI6 by directly inserting into site_examiners (examiner has only expired cert)
    getDb().prepare('INSERT OR IGNORE INTO site_examiners (site_id, examiner_id) VALUES (?,?)').run(site.id, examiner.id);
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id)).toThrow('no valid certificate');
  });

  it('SI7: auto-selects latest valid cert when no certificateId provided', () => {
    const { study, site, examiner } = makeActiveStudyWithSSE();
    // Should succeed without explicit cert
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id)).not.toThrow();
  });

  it('SI7: explicit valid certificateId is accepted', () => {
    const { study, site, examiner, cert } = makeActiveStudyWithSSE();
    expect(() => assignExaminerToStudySite(study.id, site.id, examiner.id, cert.id)).not.toThrow();
  });
});

describe('SI2: unassignSiteFromStudy blocked when SSE rows exist', () => {
  it('throws when SSE rows exist for the study-site pair', () => {
    const { study, site, examiner } = makeActiveStudyWithSSE();
    assignExaminerToStudySite(study.id, site.id, examiner.id);
    expect(() => unassignSiteFromStudy(study.id, site.id)).toThrow('examiner assignments');
  });

  it('succeeds after SSE rows are removed', () => {
    const { study, site, examiner } = makeActiveStudyWithSSE();
    assignExaminerToStudySite(study.id, site.id, examiner.id);
    unassignExaminerFromStudySite(study.id, site.id, examiner.id);
    expect(() => unassignSiteFromStudy(study.id, site.id)).not.toThrow();
  });
});

describe('D7: Planned→Active blocked when a Closed site is assigned', () => {
  it('throws when an assigned site is Closed', () => {
    const study = createStudy({ protocolId: 'D7-S', title: 'T', sponsor: 'S', phase: 'I', startDate: todayUTC() });
    const examiner = createExaminer({ examinerCode: 'D7-E', name: 'D', specialty: 'X', email: 'd@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(examiner.id, { certificateId: 'D7-C', expiresOn: futureDate(365) });
    const site = createSite({ siteCode: 'D7-SITE', name: 'Site', city: 'X', country: 'Y' });
    assignExaminerToSite(site.id, examiner.id);
    updateSite(site.id, { status: 'Active' });
    assignSiteToStudy(study.id, site.id);
    // Assign SSE so examiner count > 0
    assignExaminerToStudySite(study.id, site.id, examiner.id);
    // Close the site
    updateSite(site.id, { status: 'Closed' });
    expect(() => updateStudy(study.id, { status: 'Active' })).toThrow('Closed');
  });
});
