import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDb } from '../testHelpers';
import {
  addExaminerCertificate,
  updateExaminerCertificate,
  getCertificatesByExaminer,
  hasValidCertificate,
  createExaminer,
} from '../../services/examinerService';

process.env.JWT_SECRET = 'test-secret-key-for-cert-service';

function today(): string { return new Date().toISOString().slice(0, 10); }
function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pastDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

let examiner1Id: number;
let examiner2Id: number;

beforeAll(() => {
  setupTestDb();
  const e1 = createExaminer({ examinerCode: 'CERT-E1', name: 'E1', specialty: 'X', email: 'cert1@t.com', role: 'Sub-Investigator' });
  const e2 = createExaminer({ examinerCode: 'CERT-E2', name: 'E2', specialty: 'Y', email: 'cert2@t.com', role: 'Principal Investigator' });
  examiner1Id = e1.id;
  examiner2Id = e2.id;
});

describe('addExaminerCertificate', () => {
  it('adds a certificate successfully', () => {
    const cert = addExaminerCertificate(examiner1Id, { certificateId: 'GCP-001', expiresOn: futureDate(365) });
    expect(cert.certificateId).toBe('GCP-001');
    expect(cert.examiner_id).toBe(examiner1Id);
  });

  it('rejects duplicate certificateId for same examiner', () => {
    expect(() => addExaminerCertificate(examiner1Id, { certificateId: 'GCP-001', expiresOn: futureDate(100) }))
      .toThrow(/already exists/i);
  });

  it('allows same certificateId for different examiner', () => {
    const cert = addExaminerCertificate(examiner2Id, { certificateId: 'GCP-001', expiresOn: futureDate(365) });
    expect(cert.examiner_id).toBe(examiner2Id);
  });

  it('rejects non-existent examiner', () => {
    expect(() => addExaminerCertificate(99999, { certificateId: 'GCP-X', expiresOn: futureDate(30) }))
      .toThrow(/not found/i);
  });
});

describe('updateExaminerCertificate', () => {
  let certId: number;

  beforeAll(() => {
    const cert = addExaminerCertificate(examiner1Id, { certificateId: 'UPD-001', expiresOn: futureDate(100) });
    certId = cert.id;
  });

  it('updates expiresOn successfully', () => {
    const newDate = futureDate(200);
    const updated = updateExaminerCertificate(certId, { expiresOn: newDate });
    expect(updated.expiresOn).toBe(newDate);
  });

  it('updates certificateId successfully', () => {
    const updated = updateExaminerCertificate(certId, { certificateId: 'UPD-002' });
    expect(updated.certificateId).toBe('UPD-002');
  });

  it('rejects update to a certificateId that already exists for same examiner', () => {
    // GCP-001 already exists for examiner1
    expect(() => updateExaminerCertificate(certId, { certificateId: 'GCP-001' }))
      .toThrow(/already exists/i);
  });

  it('rejects update for non-existent certificate id', () => {
    expect(() => updateExaminerCertificate(99999, { expiresOn: futureDate(10) }))
      .toThrow(/not found/i);
  });

  it('returns unchanged cert when no fields provided', () => {
    const unchanged = updateExaminerCertificate(certId, {});
    expect(unchanged.id).toBe(certId);
  });
});

describe('hasValidCertificate', () => {
  let examiner3Id: number;

  beforeAll(() => {
    const e3 = createExaminer({ examinerCode: 'CERT-E3', name: 'E3', specialty: 'Z', email: 'cert3@t.com', role: 'Sub-Investigator' });
    examiner3Id = e3.id;
  });

  it('returns false when examiner has no certificates', () => {
    expect(hasValidCertificate(examiner3Id)).toBe(false);
  });

  it('returns false when all certificates are expired', () => {
    addExaminerCertificate(examiner3Id, { certificateId: 'EXP-A', expiresOn: pastDate(1) });
    expect(hasValidCertificate(examiner3Id)).toBe(false);
  });

  it('returns true when certificate expires today (boundary)', () => {
    addExaminerCertificate(examiner3Id, { certificateId: 'TODAY-A', expiresOn: today() });
    expect(hasValidCertificate(examiner3Id)).toBe(true);
  });

  it('returns true when at least one certificate is valid', () => {
    // examiner3 now has expired + today + we add a future one
    addExaminerCertificate(examiner3Id, { certificateId: 'FUTURE-A', expiresOn: futureDate(365) });
    expect(hasValidCertificate(examiner3Id)).toBe(true);
  });
});

describe('getCertificatesByExaminer', () => {
  it('returns certificates ordered by expiresOn DESC', () => {
    const certs = getCertificatesByExaminer(examiner1Id);
    expect(certs.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < certs.length; i++) {
      expect(certs[i - 1].expiresOn >= certs[i].expiresOn).toBe(true);
    }
  });

  it('returns empty array for examiner with no certs', () => {
    const e4 = createExaminer({ examinerCode: 'CERT-E4', name: 'E4', specialty: 'W', email: 'cert4@t.com', role: 'Sub-Investigator' });
    expect(getCertificatesByExaminer(e4.id)).toHaveLength(0);
  });
});
