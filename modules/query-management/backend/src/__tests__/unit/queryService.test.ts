import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as queryService from '../../services/queryService';

describe('queryService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createQuery', () => {
    it('creates a query for a SUBMITTED form instance', () => {
      // formInstanceId=1 is SUBMITTED in seed
      const q = queryService.createQuery(1, 'Age discrepancy', 'Age value seems incorrect', 'Please verify age field');
      expect(q.title).toBe('Age discrepancy');
      expect(q.status).toBe('OPEN');
      expect(q.messages.length).toBe(1);
      expect(q.messages[0].authorRole).toBe('DATA_MANAGER');
      expect(q.messages[0].message).toBe('Please verify age field');
    });

    it('rejects if form instance is not SUBMITTED', () => {
      // formInstanceId=2 is DRAFT in seed
      expect(() =>
        queryService.createQuery(2, 'Test', 'Desc', 'Msg')
      ).toThrow(/Form instance not submitted/);
    });

    it('rejects if form instance does not exist', () => {
      expect(() =>
        queryService.createQuery(999, 'Test', 'Desc', 'Msg')
      ).toThrow(/Form instance not found/);
    });
  });

  describe('postQueryMessage', () => {
    it('SITE_COORDINATOR can post message and status becomes ANSWERED', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      const updated = queryService.postQueryMessage(q.id, 'Fixed the value', 'SITE_COORDINATOR');
      expect(updated.status).toBe('ANSWERED');
      expect(updated.messages.length).toBe(2);
      expect(updated.messages[1].authorRole).toBe('SITE_COORDINATOR');
    });

    it('DATA_MANAGER can post follow-up and status becomes OPEN', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.postQueryMessage(q.id, 'Response', 'SITE_COORDINATOR');
      const updated = queryService.postQueryMessage(q.id, 'Still not right', 'DATA_MANAGER');
      expect(updated.status).toBe('OPEN');
      expect(updated.messages.length).toBe(3);
    });

    it('allows multiple back-and-forth messages', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.postQueryMessage(q.id, 'R1', 'SITE_COORDINATOR');
      queryService.postQueryMessage(q.id, 'Follow-up', 'DATA_MANAGER');
      queryService.postQueryMessage(q.id, 'R2', 'SITE_COORDINATOR');
      const result = queryService.getQuery(q.id);
      expect(result.messages.length).toBe(4);
      expect(result.status).toBe('ANSWERED');
    });

    it('rejects message on CLOSED query', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.closeQuery(q.id);
      expect(() =>
        queryService.postQueryMessage(q.id, 'Late msg', 'SITE_COORDINATOR')
      ).toThrow(/Query is closed/);
    });

    it('rejects message on ARCHIVED query', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.archiveQuery(q.id);
      expect(() =>
        queryService.postQueryMessage(q.id, 'Late msg', 'DATA_MANAGER')
      ).toThrow(/Query is archived/);
    });
  });

  describe('closeQuery', () => {
    it('closes from OPEN (no site response yet)', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      const closed = queryService.closeQuery(q.id);
      expect(closed.status).toBe('CLOSED');
    });

    it('closes from ANSWERED', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.postQueryMessage(q.id, 'Response', 'SITE_COORDINATOR');
      const closed = queryService.closeQuery(q.id);
      expect(closed.status).toBe('CLOSED');
    });

    it('is idempotent for already CLOSED', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.closeQuery(q.id);
      const again = queryService.closeQuery(q.id);
      expect(again.status).toBe('CLOSED');
    });

    it('rejects closing an ARCHIVED query', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.archiveQuery(q.id);
      expect(() => queryService.closeQuery(q.id)).toThrow(/Query is archived/);
    });
  });

  describe('reopenQuery', () => {
    it('reopens a CLOSED query', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.closeQuery(q.id);
      const reopened = queryService.reopenQuery(q.id);
      expect(reopened.status).toBe('OPEN');
    });

    it('rejects reopen if not CLOSED', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      expect(() => queryService.reopenQuery(q.id)).toThrow(/Query is not closed/);
    });
  });

  describe('archiveQuery', () => {
    it('archives a query', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      const archived = queryService.archiveQuery(q.id);
      expect(archived.status).toBe('ARCHIVED');
    });

    it('is idempotent', () => {
      const q = queryService.createQuery(1, 'Q1', 'Desc', 'Initial');
      queryService.archiveQuery(q.id);
      const again = queryService.archiveQuery(q.id);
      expect(again.status).toBe('ARCHIVED');
    });
  });

  describe('getQueriesByFormInstance', () => {
    it('returns paginated queries', () => {
      queryService.createQuery(1, 'Q1', 'D1', 'M1');
      queryService.createQuery(1, 'Q2', 'D2', 'M2');
      const result = queryService.getQueriesByFormInstance(1, 1, 10);
      expect(result.total).toBe(2);
      expect(result.rows.length).toBe(2);
    });
  });
});
