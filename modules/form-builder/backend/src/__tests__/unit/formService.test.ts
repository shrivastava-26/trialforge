import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as formService from '../../services/formService';

describe('formService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createForm', () => {
    it('creates a form in DRAFT status', () => {
      const form = formService.createForm(99, 'Adverse Events');
      expect(form.name).toBe('Adverse Events');
      expect(form.studyId).toBe(99);
      expect(form.version).toBe(1);
      expect(form.status).toBe('DRAFT');
    });

    it('rejects duplicate form name for same study', () => {
      formService.createForm(99, 'Lab Results');
      expect(() => formService.createForm(99, 'Lab Results')).toThrow(/Duplicate form name/);
    });

    it('allows same name in different study', () => {
      formService.createForm(99, 'Vitals');
      const form = formService.createForm(100, 'Vitals');
      expect(form.studyId).toBe(100);
    });
  });

  describe('addField', () => {
    it('adds a field to a DRAFT form', () => {
      const form = formService.createForm(99, 'Test Form');
      const field = formService.addField(form.id, {
        fieldKey: 'weight',
        label: 'Weight (kg)',
        fieldType: 'NUMBER',
        required: true,
        optionsJson: null,
      });
      expect(field.fieldKey).toBe('weight');
      expect(field.fieldType).toBe('NUMBER');
      expect(field.required).toBe(true);
    });

    it('rejects adding field to ACTIVE form', () => {
      // Seed form id=2 is DRAFT, publish it first
      const form = formService.createForm(99, 'Locked Form');
      formService.publishForm(form.id);
      expect(() =>
        formService.addField(form.id, {
          fieldKey: 'x',
          label: 'X',
          fieldType: 'TEXT',
          required: false,
          optionsJson: null,
        })
      ).toThrow(/Form is not editable/);
    });

    it('rejects duplicate fieldKey within form', () => {
      const form = formService.createForm(99, 'Dup Key Form');
      formService.addField(form.id, { fieldKey: 'bp', label: 'BP', fieldType: 'NUMBER', required: false, optionsJson: null });
      expect(() =>
        formService.addField(form.id, { fieldKey: 'bp', label: 'BP2', fieldType: 'TEXT', required: false, optionsJson: null })
      ).toThrow(/Duplicate field key/);
    });

    it('requires optionsJson for DROPDOWN type', () => {
      const form = formService.createForm(99, 'Options Form');
      expect(() =>
        formService.addField(form.id, { fieldKey: 'dd', label: 'Dropdown', fieldType: 'DROPDOWN', required: false, optionsJson: null })
      ).toThrow(/optionsJson is required/);
    });

    it('rejects optionsJson for TEXT type', () => {
      const form = formService.createForm(99, 'No Options Form');
      expect(() =>
        formService.addField(form.id, { fieldKey: 'txt', label: 'Text', fieldType: 'TEXT', required: false, optionsJson: '["a"]' })
      ).toThrow(/optionsJson must be null/);
    });

    it('validates optionsJson is valid JSON array', () => {
      const form = formService.createForm(99, 'Bad JSON Form');
      expect(() =>
        formService.addField(form.id, { fieldKey: 'dd', label: 'DD', fieldType: 'DROPDOWN', required: false, optionsJson: 'not-json' })
      ).toThrow(/optionsJson must be valid JSON/);
    });
  });

  describe('publishForm', () => {
    it('publishes a DRAFT form to ACTIVE', () => {
      const form = formService.createForm(99, 'Pub Form');
      const published = formService.publishForm(form.id);
      expect(published.status).toBe('ACTIVE');
    });

    it('archives previous ACTIVE version when publishing new one', () => {
      // Seed has Demographics (id=1) as ACTIVE for study 1
      // Create new version and publish it
      const newVer = formService.createNewFormVersion(1); // copy from Demographics
      const published = formService.publishForm(newVer.id);
      expect(published.status).toBe('ACTIVE');

      // Original should now be ARCHIVED
      const original = formService.getForm(1);
      expect(original.status).toBe('ARCHIVED');
    });

    it('rejects publishing an already ACTIVE form', () => {
      const form = formService.createForm(99, 'Already Active');
      formService.publishForm(form.id);
      expect(() => formService.publishForm(form.id)).toThrow(/Form is not editable/);
    });
  });

  describe('createNewFormVersion', () => {
    it('creates a new version with copied fields', () => {
      // Seed Demographics (id=1) has 3 fields
      const newVer = formService.createNewFormVersion(1);
      expect(newVer.version).toBe(2);
      expect(newVer.status).toBe('DRAFT');
      expect(newVer.fields.length).toBe(3);
      expect(newVer.fields[0].fieldKey).toBe('age');
    });

    it('increments version correctly', () => {
      const v2 = formService.createNewFormVersion(1);
      const v3 = formService.createNewFormVersion(v2.id);
      expect(v3.version).toBe(3);
    });
  });

  describe('archiveForm', () => {
    it('archives a form', () => {
      const form = formService.createForm(99, 'To Archive');
      const archived = formService.archiveForm(form.id);
      expect(archived.status).toBe('ARCHIVED');
    });

    it('is idempotent for already archived', () => {
      const form = formService.createForm(99, 'Idem Archive');
      formService.archiveForm(form.id);
      const again = formService.archiveForm(form.id);
      expect(again.status).toBe('ARCHIVED');
    });
  });

  describe('getForms', () => {
    it('returns paginated forms for a study', () => {
      const result = formService.getForms(1, 1, 10);
      expect(result.total).toBe(2); // seed has 2 forms for study 1
    });
  });

  describe('getForm', () => {
    it('returns form with fields', () => {
      const form = formService.getForm(1);
      expect(form.name).toBe('Demographics');
      expect(form.fields.length).toBe(3);
    });

    it('throws for non-existent form', () => {
      expect(() => formService.getForm(9999)).toThrow(/Form not found/);
    });
  });
});
