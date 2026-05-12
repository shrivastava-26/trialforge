import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as patientService from '../../services/patientService';

describe('patientService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createPatient', () => {
    it('creates a patient with normalized subjectId', () => {
      const patient = patientService.createPatient('subj-9999');
      expect(patient.subjectId).toBe('SUBJ-9999');
      expect(patient.status).toBe('SCREENED');
      expect(patient.id).toBeGreaterThan(0);
    });

    it('rejects duplicate subjectId', () => {
      patientService.createPatient('SUBJ-DUP');
      expect(() => patientService.createPatient('SUBJ-DUP')).toThrow(/Duplicate subject ID/);
    });

    it('rejects duplicate subjectId case-insensitive', () => {
      patientService.createPatient('SUBJ-CASE');
      expect(() => patientService.createPatient('subj-case')).toThrow(/Duplicate subject ID/);
    });
  });

  describe('assignPatientToStudySite', () => {
    it('assigns a patient to a study/site', () => {
      const patient = patientService.createPatient('SUBJ-ASSIGN');
      const assignment = patientService.assignPatientToStudySite(patient.id, 'STUDY-X', 'SITE-Y');
      expect(assignment.studyId).toBe('STUDY-X');
      expect(assignment.siteId).toBe('SITE-Y');
      expect(assignment.patientId).toBe(patient.id);
      expect(assignment.status).toBe('SCREENED');
    });

    it('blocks assignment of ARCHIVED patient', () => {
      const patient = patientService.createPatient('SUBJ-ARC');
      patientService.archivePatient(patient.id);
      expect(() =>
        patientService.assignPatientToStudySite(patient.id, 'STUDY-X', 'SITE-Y')
      ).toThrow(/Cannot assign an ARCHIVED patient/);
    });

    it('rejects duplicate assignment', () => {
      const patient = patientService.createPatient('SUBJ-DUPASGN');
      patientService.assignPatientToStudySite(patient.id, 'STUDY-X', 'SITE-Y');
      expect(() =>
        patientService.assignPatientToStudySite(patient.id, 'STUDY-X', 'SITE-Y')
      ).toThrow(/Duplicate assignment/);
    });
  });

  describe('status transitions', () => {
    it('allows forward transition SCREENED → ELIGIBLE', () => {
      const patient = patientService.createPatient('SUBJ-FWD1');
      const updated = patientService.updatePatient(patient.id, { status: 'ELIGIBLE' });
      expect(updated.status).toBe('ELIGIBLE');
    });

    it('allows ELIGIBLE → ENROLLED', () => {
      const patient = patientService.createPatient('SUBJ-FWD2');
      patientService.updatePatient(patient.id, { status: 'ELIGIBLE' });
      const updated = patientService.updatePatient(patient.id, { status: 'ENROLLED' });
      expect(updated.status).toBe('ENROLLED');
    });

    it('allows ENROLLED → COMPLETED', () => {
      const patient = patientService.createPatient('SUBJ-FWD3');
      patientService.updatePatient(patient.id, { status: 'ELIGIBLE' });
      patientService.updatePatient(patient.id, { status: 'ENROLLED' });
      const updated = patientService.updatePatient(patient.id, { status: 'COMPLETED' });
      expect(updated.status).toBe('COMPLETED');
    });

    it('allows ENROLLED → WITHDRAWN', () => {
      const patient = patientService.createPatient('SUBJ-FWD4');
      patientService.updatePatient(patient.id, { status: 'ELIGIBLE' });
      patientService.updatePatient(patient.id, { status: 'ENROLLED' });
      const updated = patientService.updatePatient(patient.id, { status: 'WITHDRAWN' });
      expect(updated.status).toBe('WITHDRAWN');
    });

    it('rejects backward transition ELIGIBLE → SCREENED', () => {
      const patient = patientService.createPatient('SUBJ-BACK1');
      patientService.updatePatient(patient.id, { status: 'ELIGIBLE' });
      expect(() =>
        patientService.updatePatient(patient.id, { status: 'SCREENED' })
      ).toThrow(/Invalid status transition/);
    });

    it('rejects skip transition SCREENED → ENROLLED', () => {
      const patient = patientService.createPatient('SUBJ-SKIP1');
      expect(() =>
        patientService.updatePatient(patient.id, { status: 'ENROLLED' })
      ).toThrow(/Invalid status transition/);
    });

    it('rejects transition out of ARCHIVED', () => {
      const patient = patientService.createPatient('SUBJ-TERM');
      patientService.archivePatient(patient.id);
      expect(() =>
        patientService.updatePatient(patient.id, { status: 'SCREENED' })
      ).toThrow(/Invalid status transition/);
    });

    it('study subject status transitions enforce same rules', () => {
      const patient = patientService.createPatient('SUBJ-SS');
      const assignment = patientService.assignPatientToStudySite(patient.id, 'ST-1', 'SI-1');
      // forward ok
      const updated = patientService.updateStudySubjectStatus(assignment.id, 'ELIGIBLE');
      expect(updated.status).toBe('ELIGIBLE');
      // backward rejected
      expect(() =>
        patientService.updateStudySubjectStatus(assignment.id, 'SCREENED')
      ).toThrow(/Invalid status transition/);
    });
  });

  describe('archivePatient', () => {
    it('archives a patient from any allowed state', () => {
      const patient = patientService.createPatient('SUBJ-ARCHIVE');
      const archived = patientService.archivePatient(patient.id);
      expect(archived.status).toBe('ARCHIVED');
    });

    it('is idempotent for already-archived patient', () => {
      const patient = patientService.createPatient('SUBJ-IDEM');
      patientService.archivePatient(patient.id);
      const again = patientService.archivePatient(patient.id);
      expect(again.status).toBe('ARCHIVED');
    });
  });

  describe('getPatients', () => {
    it('returns paginated results', () => {
      const result = patientService.getPatients(1, 10);
      expect(result.total).toBeGreaterThanOrEqual(5); // seed data
      expect(result.rows.length).toBeLessThanOrEqual(10);
    });

    it('filters by status', () => {
      const result = patientService.getPatients(1, 100, { status: 'ENROLLED' });
      for (const p of result.rows) {
        expect(p.status).toBe('ENROLLED');
      }
    });
  });
});
