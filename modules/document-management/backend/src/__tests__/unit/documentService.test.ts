import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as documentService from '../../services/documentService';

describe('documentService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createDocument', () => {
    it('creates a document in DRAFT status', () => {
      const doc = documentService.createDocument(1, 'New Protocol', 'Protocol');
      expect(doc.title).toBe('New Protocol');
      expect(doc.category).toBe('Protocol');
      expect(doc.status).toBe('DRAFT');
      expect(doc.studyId).toBe(1);
    });
  });

  describe('addDocumentVersion', () => {
    it('adds first version to a document', () => {
      const doc = documentService.createDocument(1, 'Test Doc', 'TMF');
      const ver = documentService.addDocumentVersion(doc.id, '/docs/test-v1.pdf');
      expect(ver.versionNumber).toBe(1);
      expect(ver.fileRef).toBe('/docs/test-v1.pdf');
      expect(ver.status).toBe('ACTIVE');
    });

    it('increments version and supersedes previous ACTIVE', () => {
      const doc = documentService.createDocument(1, 'Versioned', 'Protocol');
      documentService.addDocumentVersion(doc.id, '/v1.pdf');
      const v2 = documentService.addDocumentVersion(doc.id, '/v2.pdf');
      expect(v2.versionNumber).toBe(2);
      expect(v2.status).toBe('ACTIVE');

      // Check previous version is SUPERSEDED
      const full = documentService.getDocument(doc.id);
      const v1 = full.versions.find(v => v.versionNumber === 1);
      expect(v1!.status).toBe('SUPERSEDED');
    });

    it('rejects adding version to ARCHIVED document', () => {
      const doc = documentService.createDocument(1, 'Archived Doc', 'Other');
      documentService.archiveDocument(doc.id);
      expect(() =>
        documentService.addDocumentVersion(doc.id, '/new.pdf')
      ).toThrow(/Document is archived/);
    });

    it('handles multiple versions correctly', () => {
      const doc = documentService.createDocument(1, 'Multi', 'ICF');
      documentService.addDocumentVersion(doc.id, '/v1.pdf');
      documentService.addDocumentVersion(doc.id, '/v2.pdf');
      const v3 = documentService.addDocumentVersion(doc.id, '/v3.pdf');
      expect(v3.versionNumber).toBe(3);

      const full = documentService.getDocument(doc.id);
      expect(full.versions.length).toBe(3);
      // Only latest should be ACTIVE
      const activeVersions = full.versions.filter(v => v.status === 'ACTIVE');
      expect(activeVersions.length).toBe(1);
      expect(activeVersions[0].versionNumber).toBe(3);
    });
  });

  describe('archiveDocument', () => {
    it('archives document and all versions', () => {
      const doc = documentService.createDocument(1, 'To Archive', 'TMF');
      documentService.addDocumentVersion(doc.id, '/v1.pdf');
      documentService.addDocumentVersion(doc.id, '/v2.pdf');

      const archived = documentService.archiveDocument(doc.id);
      expect(archived.status).toBe('ARCHIVED');

      const full = documentService.getDocument(doc.id);
      for (const v of full.versions) {
        expect(v.status).toBe('ARCHIVED');
      }
    });

    it('is idempotent', () => {
      const doc = documentService.createDocument(1, 'Idem', 'Other');
      documentService.archiveDocument(doc.id);
      const again = documentService.archiveDocument(doc.id);
      expect(again.status).toBe('ARCHIVED');
    });
  });

  describe('setDocumentStatus', () => {
    it('sets DRAFT to ACTIVE', () => {
      const doc = documentService.createDocument(1, 'Activate', 'Protocol');
      const updated = documentService.setDocumentStatus(doc.id, 'ACTIVE');
      expect(updated.status).toBe('ACTIVE');
    });

    it('rejects changing status of ARCHIVED document', () => {
      const doc = documentService.createDocument(1, 'Locked', 'Other');
      documentService.archiveDocument(doc.id);
      expect(() =>
        documentService.setDocumentStatus(doc.id, 'ACTIVE')
      ).toThrow(/Document is archived/);
    });
  });

  describe('getDocumentsByStudy', () => {
    it('returns paginated documents', () => {
      const result = documentService.getDocumentsByStudy(1, 1, 10);
      expect(result.total).toBe(2); // seed has 2 docs for study 1
    });

    it('filters by category', () => {
      const result = documentService.getDocumentsByStudy(1, 1, 10, { category: 'Protocol' });
      expect(result.rows.every(d => d.category === 'Protocol')).toBe(true);
    });
  });

  describe('getDocument', () => {
    it('returns document with versions', () => {
      const doc = documentService.getDocument(1); // seed doc
      expect(doc.title).toBe('Study Protocol v1');
      expect(doc.versions.length).toBe(1);
    });

    it('throws for non-existent', () => {
      expect(() => documentService.getDocument(9999)).toThrow(/Document not found/);
    });
  });
});
