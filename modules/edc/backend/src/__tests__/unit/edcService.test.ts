import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as edcService from '../../services/edcService';
import { execute } from '../../db/query';

describe('edcService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createFormInstance', () => {
    it('creates instance for a valid PLANNED visit', () => {
      // patientVisitId=1 is PLANNED, studySubject=1 (STUDY-001), form=1 is ACTIVE for study 1
      const inst = edcService.createFormInstance(1);
      expect(inst.patientVisitId).toBe(1);
      expect(inst.formId).toBe(1); // auto-selected ACTIVE form
      expect(inst.status).toBe('DRAFT');
    });

    it('rejects if visit is CANCELLED', () => {
      // patientVisitId=2 is CANCELLED
      expect(() => edcService.createFormInstance(2)).toThrow(/Visit is CANCELLED/);
    });

    it('rejects if visit is ARCHIVED', () => {
      execute("UPDATE tf_patient_visits SET status = 'ARCHIVED' WHERE id = 1");
      expect(() => edcService.createFormInstance(1)).toThrow(/Visit is ARCHIVED/);
    });

    it('rejects if no ACTIVE form exists for study', () => {
      // Archive the only active form for study 1
      execute("UPDATE tf_forms SET status = 'ARCHIVED' WHERE id = 1");
      expect(() => edcService.createFormInstance(1)).toThrow(/No active form for study/);
    });

    it('rejects duplicate instance for same visit+form', () => {
      edcService.createFormInstance(1);
      expect(() => edcService.createFormInstance(1)).toThrow(/Duplicate form instance/);
    });
  });

  describe('saveFormResponse', () => {
    it('saves a valid draft response', () => {
      const inst = edcService.createFormInstance(1);
      const result = edcService.saveFormResponse(inst.id, JSON.stringify({ age: 30, sex: 'Male' }));
      expect(result.response).not.toBeNull();
      expect(result.response!.responseJson).toContain('"age":30');
    });

    it('rejects save when instance is SUBMITTED', () => {
      const inst = edcService.createFormInstance(1);
      const validData = JSON.stringify({ age: 30, sex: 'Male', consent: true, visit_date: '2025-01-15' });
      edcService.saveFormResponse(inst.id, validData);
      edcService.submitFormInstance(inst.id);
      expect(() => edcService.saveFormResponse(inst.id, validData)).toThrow(/Instance is SUBMITTED/);
    });

    it('rejects invalid JSON', () => {
      const inst = edcService.createFormInstance(1);
      expect(() => edcService.saveFormResponse(inst.id, 'not-json')).toThrow(/Invalid JSON/);
    });

    it('rejects NUMBER field with string value', () => {
      const inst = edcService.createFormInstance(1);
      expect(() =>
        edcService.saveFormResponse(inst.id, JSON.stringify({ age: 'thirty' }))
      ).toThrow(/Response validation failed/);
    });

    it('rejects DROPDOWN value not in options', () => {
      const inst = edcService.createFormInstance(1);
      expect(() =>
        edcService.saveFormResponse(inst.id, JSON.stringify({ sex: 'Unknown' }))
      ).toThrow(/Response validation failed/);
    });

    it('rejects CHECKBOX with non-boolean', () => {
      const inst = edcService.createFormInstance(1);
      expect(() =>
        edcService.saveFormResponse(inst.id, JSON.stringify({ consent: 'yes' }))
      ).toThrow(/Response validation failed/);
    });

    it('rejects DATE with invalid format', () => {
      const inst = edcService.createFormInstance(1);
      expect(() =>
        edcService.saveFormResponse(inst.id, JSON.stringify({ visit_date: '15-01-2025' }))
      ).toThrow(/Response validation failed/);
    });
  });

  describe('submitFormInstance', () => {
    it('submits when all required fields present', () => {
      const inst = edcService.createFormInstance(1);
      const validData = JSON.stringify({
        age: 30,
        sex: 'Male',
        consent: true,
        visit_date: '2025-01-15',
      });
      edcService.saveFormResponse(inst.id, validData);
      const result = edcService.submitFormInstance(inst.id);
      expect(result.status).toBe('SUBMITTED');
      expect(result.response!.submittedAt).not.toBeNull();
    });

    it('rejects if required fields missing', () => {
      const inst = edcService.createFormInstance(1);
      // Only save age, missing sex/consent/visit_date which are required
      edcService.saveFormResponse(inst.id, JSON.stringify({ age: 30 }));
      expect(() => edcService.submitFormInstance(inst.id)).toThrow(/Submission validation failed/);
    });

    it('rejects submit on already SUBMITTED instance', () => {
      const inst = edcService.createFormInstance(1);
      const validData = JSON.stringify({ age: 30, sex: 'Male', consent: true, visit_date: '2025-01-15' });
      edcService.saveFormResponse(inst.id, validData);
      edcService.submitFormInstance(inst.id);
      expect(() => edcService.submitFormInstance(inst.id)).toThrow(/Instance is SUBMITTED/);
    });

    it('blocks further saves after submit', () => {
      const inst = edcService.createFormInstance(1);
      const validData = JSON.stringify({ age: 30, sex: 'Male', consent: true, visit_date: '2025-01-15' });
      edcService.saveFormResponse(inst.id, validData);
      edcService.submitFormInstance(inst.id);
      expect(() => edcService.saveFormResponse(inst.id, validData)).toThrow(/Instance is SUBMITTED/);
    });
  });

  describe('archiveFormInstance', () => {
    it('archives an instance', () => {
      const inst = edcService.createFormInstance(1);
      const archived = edcService.archiveFormInstance(inst.id);
      expect(archived.status).toBe('ARCHIVED');
    });

    it('is idempotent', () => {
      const inst = edcService.createFormInstance(1);
      edcService.archiveFormInstance(inst.id);
      const again = edcService.archiveFormInstance(inst.id);
      expect(again.status).toBe('ARCHIVED');
    });
  });

  describe('getFormInstancesByVisit', () => {
    it('returns instances for a visit', () => {
      edcService.createFormInstance(1);
      const list = edcService.getFormInstancesByVisit(1);
      expect(list.length).toBe(1);
    });
  });
});
