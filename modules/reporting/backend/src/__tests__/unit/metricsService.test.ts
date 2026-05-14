import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as metricsService from '../../services/metricsService';

describe('metricsService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('getDashboardMetrics — global (ADMIN)', () => {
    it('returns correct global counts', () => {
      const m = metricsService.getDashboardMetrics({}, ['ADMIN']);
      // Patients: 4 total, 2 enrolled (via study_subjects), 1 archived
      expect(m.patientsTotal).toBe(4);
      expect(m.patientsEnrolled).toBe(2);
      expect(m.patientsArchived).toBe(1);
      // Visits: 2 PLANNED, 1 COMPLETED, 1 MISSED
      expect(m.visitsPlanned).toBe(2);
      expect(m.visitsCompleted).toBe(1);
      expect(m.visitsMissed).toBe(1);
      // Forms: 2 ACTIVE
      expect(m.formsActive).toBe(2);
      // Form instances: 1 DRAFT, 2 SUBMITTED
      expect(m.formInstancesDraft).toBe(1);
      expect(m.formInstancesSubmitted).toBe(2);
      // Queries: 1 OPEN, 1 ANSWERED, 1 CLOSED
      expect(m.queriesOpen).toBe(1);
      expect(m.queriesAnswered).toBe(1);
      expect(m.queriesClosed).toBe(1);
      // Documents: 3 total, 1 archived, 3 versions
      expect(m.documentsTotal).toBe(3);
      expect(m.documentsArchived).toBe(1);
      expect(m.documentVersionsTotal).toBe(3);
    });
  });

  describe('getDashboardMetrics — filtered by siteId', () => {
    it('SITE-A returns only SITE-A data', () => {
      const m = metricsService.getDashboardMetrics({ siteId: 'SITE-A' }, ['SITE_COORDINATOR']);
      // SITE-A has study_subjects: id=1 (ENROLLED), id=3 (ARCHIVED)
      expect(m.patientsTotal).toBe(2); // distinct patient_ids: 1, 3
      expect(m.patientsEnrolled).toBe(1);
      expect(m.patientsArchived).toBe(1);
      // Visits for SITE-A subjects (id=1): 2 visits (PLANNED, COMPLETED)
      expect(m.visitsPlanned).toBe(1);
      expect(m.visitsCompleted).toBe(1);
      expect(m.visitsMissed).toBe(0);
      // Form instances via visits of SITE-A subjects
      expect(m.formInstancesDraft).toBe(1);
      expect(m.formInstancesSubmitted).toBe(1);
      // Queries via form instances of SITE-A
      expect(m.queriesOpen).toBe(1);
      expect(m.queriesAnswered).toBe(1);
      expect(m.queriesClosed).toBe(0);
    });

    it('SITE-B returns only SITE-B data', () => {
      const m = metricsService.getDashboardMetrics({ siteId: 'SITE-B' }, ['SITE_COORDINATOR']);
      // SITE-B has study_subjects: id=2 (ENROLLED), id=4 (SCREENED)
      expect(m.patientsEnrolled).toBe(1);
      // Visits for SITE-B subject id=2: 2 visits (MISSED, PLANNED)
      expect(m.visitsPlanned).toBe(1);
      expect(m.visitsMissed).toBe(1);
      expect(m.visitsCompleted).toBe(0);
    });
  });

  describe('getDashboardMetrics — filtered by studyId + siteId', () => {
    it('STUDY-001 + SITE-A narrows further', () => {
      const m = metricsService.getDashboardMetrics({ studyId: 'STUDY-001', siteId: 'SITE-A' }, ['SITE_COORDINATOR']);
      expect(m.patientsEnrolled).toBe(1);
      expect(m.visitsPlanned).toBe(1);
      expect(m.visitsCompleted).toBe(1);
      // Documents for study 1
      expect(m.documentsTotal).toBe(2);
    });
  });

  describe('RBAC enforcement', () => {
    it('SITE_COORDINATOR without siteId throws BAD_USER_INPUT', () => {
      expect(() =>
        metricsService.getDashboardMetrics({}, ['SITE_COORDINATOR'])
      ).toThrow(/siteId is required for SITE_COORDINATOR/);
    });

    it('SITE_COORDINATOR with siteId succeeds', () => {
      const m = metricsService.getDashboardMetrics({ siteId: 'SITE-A' }, ['SITE_COORDINATOR']);
      expect(m.patientsTotal).toBeGreaterThan(0);
    });

    it('ADMIN without siteId succeeds (global)', () => {
      const m = metricsService.getDashboardMetrics({}, ['ADMIN']);
      expect(m.patientsTotal).toBe(4);
    });

    it('CRO_MANAGER without siteId succeeds (global)', () => {
      const m = metricsService.getDashboardMetrics({}, ['CRO_MANAGER']);
      expect(m.patientsTotal).toBe(4);
    });

    it('DATA_MANAGER without siteId succeeds (global)', () => {
      const m = metricsService.getDashboardMetrics({}, ['DATA_MANAGER']);
      expect(m.patientsTotal).toBe(4);
    });
  });
});
