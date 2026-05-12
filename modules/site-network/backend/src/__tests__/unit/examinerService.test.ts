import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import {
  createExaminer, addExaminerCertificate, updateExaminerCertificate,
  hasValidCertificate, getCertificatesByExaminer,
} from '../../services/examinerService';

function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pastDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => { setupTestDb(); });

describe('hasValidCertificate', () => {
  it('returns false when no certificates exist', () => {
    const e = createExaminer({ examinerCode: 'E001', name: 'A', specialty: 'X', email: 'a@t.com', role: 'Sub-Investigator' });
    expect(hasValidCertificate(e.id)).toBe(false);
  });

  it('returns false when only expired certificates exist', () => {
    const e = createExaminer({ examinerCode: 'E002', name: 'B', specialty: 'X', email: 'b@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e.id, { certificateId: 'CERT-EXP', expiresOn: pastDate(1) });
    expect(hasValidCertificate(e.id)).toBe(false);
  });

  it('returns true when at least one valid certificate exists', () => {
    const e = createExaminer({ examinerCode: 'E003', name: 'C', specialty: 'X', email: 'c@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e.id, { certificateId: 'CERT-VALID', expiresOn: futureDate(365) });
    expect(hasValidCertificate(e.id)).toBe(true);
  });
});

describe('addExaminerCertificate', () => {
  it('rejects duplicate certificateId for the same examiner', () => {
    const e = createExaminer({ examinerCode: 'E004', name: 'D', specialty: 'X', email: 'd@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e.id, { certificateId: 'CERT-DUP', expiresOn: futureDate(365) });
    expect(() =>
      addExaminerCertificate(e.id, { certificateId: 'CERT-DUP', expiresOn: futureDate(200) })
    ).toThrow('already exists');
  });

  it('allows same certificateId for different examiners', () => {
    const e1 = createExaminer({ examinerCode: 'E005', name: 'E', specialty: 'X', email: 'e@t.com', role: 'Sub-Investigator' });
    const e2 = createExaminer({ examinerCode: 'E006', name: 'F', specialty: 'X', email: 'f@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e1.id, { certificateId: 'CERT-SHARED', expiresOn: futureDate(365) });
    expect(() =>
      addExaminerCertificate(e2.id, { certificateId: 'CERT-SHARED', expiresOn: futureDate(365) })
    ).not.toThrow();
  });
});

describe('updateExaminerCertificate', () => {
  it('rejects changing certificateId to one that already exists for the same examiner', () => {
    const e = createExaminer({ examinerCode: 'E007', name: 'G', specialty: 'X', email: 'g@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e.id, { certificateId: 'CERT-A', expiresOn: futureDate(365) });
    const cert2 = addExaminerCertificate(e.id, { certificateId: 'CERT-B', expiresOn: futureDate(200) });
    expect(() =>
      updateExaminerCertificate(cert2.id, { certificateId: 'CERT-A' })
    ).toThrow('already exists');
  });

  it('returns unchanged cert when no fields provided', () => {
    const e = createExaminer({ examinerCode: 'E008', name: 'H', specialty: 'X', email: 'h@t.com', role: 'Sub-Investigator' });
    const cert = addExaminerCertificate(e.id, { certificateId: 'CERT-C', expiresOn: futureDate(365) });
    const result = updateExaminerCertificate(cert.id, {});
    expect(result.certificateId).toBe('CERT-C');
  });
});

describe('getCertificatesByExaminer', () => {
  it('returns certs ordered by expiresOn DESC', () => {
    const e = createExaminer({ examinerCode: 'E009', name: 'I', specialty: 'X', email: 'i@t.com', role: 'Sub-Investigator' });
    addExaminerCertificate(e.id, { certificateId: 'CERT-EARLY', expiresOn: futureDate(100) });
    addExaminerCertificate(e.id, { certificateId: 'CERT-LATE', expiresOn: futureDate(500) });
    const certs = getCertificatesByExaminer(e.id);
    expect(certs[0].certificateId).toBe('CERT-LATE');
  });
});
