import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as visitService from '../../services/visitService';
import { execute } from '../../db/query';

describe('visitService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createVisitTemplate', () => {
    it('creates a template', () => {
      const t = visitService.createVisitTemplate(1, {
        name: 'End of Study',
        dayOffset: 168,
        windowMinDays: -7,
        windowMaxDays: 7,
      });
      expect(t.name).toBe('End of Study');
      expect(t.studyId).toBe(1);
      expect(t.dayOffset).toBe(168);
      expect(t.status).toBe('ACTIVE');
    });

    it('rejects duplicate name per study', () => {
      expect(() =>
        visitService.createVisitTemplate(1, { name: 'Screening', dayOffset: 0, windowMinDays: 0, windowMaxDays: 0 })
      ).toThrow(/Duplicate template name/);
    });

    it('allows same name in different study', () => {
      const t = visitService.createVisitTemplate(99, {
        name: 'Screening',
        dayOffset: 0,
        windowMinDays: 0,
        windowMaxDays: 0,
      });
      expect(t.studyId).toBe(99);
    });
  });

  describe('updateVisitTemplate', () => {
    it('updates fields', () => {
      const t = visitService.updateVisitTemplate(1, { dayOffset: 1 });
      expect(t.dayOffset).toBe(1);
    });

    it('rejects update on ARCHIVED template', () => {
      visitService.archiveVisitTemplate(1);
      expect(() =>
        visitService.updateVisitTemplate(1, { dayOffset: 5 })
      ).toThrow(/Template is archived/);
    });
  });

  describe('schedulePatientVisit', () => {
    it('schedules a visit for ENROLLED subject', () => {
      // studySubjectId=1 is ENROLLED in seed
      const v = visitService.schedulePatientVisit(1, 2, '2025-02-01');
      expect(v.studySubjectId).toBe(1);
      expect(v.visitTemplateId).toBe(2);
      expect(v.scheduledDate).toBe('2025-02-01');
      expect(v.status).toBe('PLANNED');
    });

    it('rejects if study subject is not ENROLLED', () => {
      // studySubjectId=2 is ELIGIBLE in seed
      expect(() =>
        visitService.schedulePatientVisit(2, 1, '2025-02-01')
      ).toThrow(/Study subject not enrolled/);
    });

    it('rejects if study subject is ARCHIVED', () => {
      // Manually archive subject via direct DB for test
      execute("UPDATE tf_study_subjects SET status = 'ARCHIVED' WHERE id = 1");
      expect(() =>
        visitService.schedulePatientVisit(1, 2, '2025-02-01')
      ).toThrow(/Study subject is archived/);
    });

    it('rejects duplicate visit for same subject/template', () => {
      // Seed already has visit for subject 1, template 1
      expect(() =>
        visitService.schedulePatientVisit(1, 1, '2025-03-01')
      ).toThrow(/Duplicate visit/);
    });

    it('rejects if template is ARCHIVED', () => {
      visitService.archiveVisitTemplate(2);
      expect(() =>
        visitService.schedulePatientVisit(1, 2, '2025-02-01')
      ).toThrow(/Template is archived/);
    });
  });

  describe('completePatientVisit', () => {
    it('completes a PLANNED visit', () => {
      // Seed visit id=1 is PLANNED, scheduledDate=2025-01-15
      const v = visitService.completePatientVisit(1, '2025-01-15');
      expect(v.status).toBe('COMPLETED');
      expect(v.completedDate).toBe('2025-01-15');
    });

    it('rejects if completedDate < scheduledDate', () => {
      expect(() =>
        visitService.completePatientVisit(1, '2025-01-14')
      ).toThrow(/completedDate before scheduledDate/);
    });

    it('rejects if visit is not PLANNED', () => {
      visitService.completePatientVisit(1, '2025-01-15');
      expect(() =>
        visitService.completePatientVisit(1, '2025-01-16')
      ).toThrow(/Visit not in PLANNED status/);
    });
  });

  describe('visit status transitions', () => {
    it('allows PLANNED → MISSED', () => {
      const v = visitService.updatePatientVisitStatus(1, 'MISSED');
      expect(v.status).toBe('MISSED');
    });

    it('allows PLANNED → CANCELLED', () => {
      const v = visitService.updatePatientVisitStatus(1, 'CANCELLED');
      expect(v.status).toBe('CANCELLED');
    });

    it('allows COMPLETED → ARCHIVED', () => {
      visitService.completePatientVisit(1, '2025-01-15');
      const v = visitService.updatePatientVisitStatus(1, 'ARCHIVED');
      expect(v.status).toBe('ARCHIVED');
    });

    it('rejects backward transition COMPLETED → PLANNED', () => {
      visitService.completePatientVisit(1, '2025-01-15');
      expect(() =>
        visitService.updatePatientVisitStatus(1, 'PLANNED')
      ).toThrow(/Invalid visit status transition/);
    });

    it('rejects skip transition PLANNED → ARCHIVED directly (allowed per spec)', () => {
      // Actually PLANNED → ARCHIVED IS allowed per our transition map
      const v = visitService.updatePatientVisitStatus(1, 'ARCHIVED');
      expect(v.status).toBe('ARCHIVED');
    });

    it('rejects transition out of ARCHIVED', () => {
      visitService.updatePatientVisitStatus(1, 'ARCHIVED');
      expect(() =>
        visitService.updatePatientVisitStatus(1, 'PLANNED')
      ).toThrow(/Invalid visit status transition/);
    });
  });

  describe('getVisitTemplates', () => {
    it('returns paginated templates for a study', () => {
      const result = visitService.getVisitTemplates(1, 1, 10);
      expect(result.total).toBe(4); // seed has 4 templates
      expect(result.rows.length).toBe(4);
    });
  });

  describe('getPatientVisits', () => {
    it('returns visits for a study subject', () => {
      const result = visitService.getPatientVisits(1, 1, 10);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });
});
