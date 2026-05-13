import { GraphQLError } from 'graphql';
import * as formRepo from '../repositories/formRepository';
import * as fieldRepo from '../repositories/fieldRepository';
import { TfFormRow, TfFormFieldRow, FieldType, FormStatus, OPTIONS_REQUIRED_TYPES } from '../types';
import { throwBadUserInput } from '../validation/helpers';

// --- DTOs ---

export interface Form {
  id: number;
  studyId: number;
  name: string;
  version: number;
  status: FormStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FormWithFields extends Form {
  fields: FormField[];
}

export interface FormField {
  id: number;
  formId: number;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  optionsJson: string | null;
  displayOrder: number;
}

function toForm(row: TfFormRow): Form {
  return {
    id: row.id,
    studyId: row.study_id,
    name: row.name,
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toField(row: TfFormFieldRow): FormField {
  return {
    id: row.id,
    formId: row.form_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required === 1,
    optionsJson: row.options_json,
    displayOrder: row.display_order,
  };
}

function validateOptionsJson(fieldType: FieldType, optionsJson: string | null | undefined): void {
  if (OPTIONS_REQUIRED_TYPES.includes(fieldType)) {
    if (!optionsJson) {
      throwBadUserInput({ optionsJson: `optionsJson is required for ${fieldType}` }, `optionsJson is required for ${fieldType}`);
    }
    try {
      const parsed = JSON.parse(optionsJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throwBadUserInput({ optionsJson: 'optionsJson must be a non-empty JSON array' }, 'optionsJson must be valid JSON');
      }
    } catch {
      throwBadUserInput({ optionsJson: 'optionsJson must be valid JSON' }, 'optionsJson must be valid JSON');
    }
  } else if (optionsJson) {
    throwBadUserInput({ optionsJson: `optionsJson must be null for ${fieldType}` }, `optionsJson must be null for ${fieldType}`);
  }
}

function requireFormExists(id: number): TfFormRow {
  const row = formRepo.findById(id);
  if (!row) throw new GraphQLError('Form not found', { extensions: { code: 'NOT_FOUND' } });
  return row;
}

function requireDraft(form: TfFormRow): void {
  if (form.status !== 'DRAFT') {
    throwBadUserInput({ formId: `Form must be in DRAFT status (current: ${form.status})` }, 'Form is not editable');
  }
}

// --- Queries ---

export function getForms(studyId: number, page: number, pageSize: number): { rows: Form[]; total: number } {
  const { rows, total } = formRepo.findByStudyId(studyId, page, pageSize);
  return { rows: rows.map(toForm), total };
}

export function getForm(id: number): FormWithFields {
  const row = requireFormExists(id);
  const fields = fieldRepo.findByFormId(id).map(toField);
  return { ...toForm(row), fields };
}

// --- Mutations ---

export function createForm(studyId: number, name: string): Form {
  const existing = formRepo.findByStudyNameVersion(studyId, name, 1);
  if (existing) {
    throwBadUserInput({ name: 'Form with this name already exists for this study' }, 'Duplicate form name');
  }
  const id = formRepo.insert(studyId, name, 1);
  return toForm(formRepo.findById(id)!);
}

export function addField(
  formId: number,
  input: { fieldKey: string; label: string; fieldType: FieldType; required: boolean; optionsJson: string | null; displayOrder?: number }
): FormField {
  const form = requireFormExists(formId);
  requireDraft(form);

  const dup = fieldRepo.findByFormIdAndKey(formId, input.fieldKey);
  if (dup) {
    throwBadUserInput({ fieldKey: 'fieldKey already exists in this form' }, 'Duplicate field key');
  }

  validateOptionsJson(input.fieldType, input.optionsJson);

  const order = input.displayOrder ?? fieldRepo.getMaxDisplayOrder(formId) + 1;
  const id = fieldRepo.insert(formId, input.fieldKey, input.label, input.fieldType, input.required ? 1 : 0, input.optionsJson, order);
  return toField(fieldRepo.findById(id)!);
}

export function updateField(
  fieldId: number,
  input: { label?: string; fieldType?: FieldType; required?: boolean; optionsJson?: string | null; displayOrder?: number }
): FormField {
  const field = fieldRepo.findById(fieldId);
  if (!field) throw new GraphQLError('Field not found', { extensions: { code: 'NOT_FOUND' } });

  const form = requireFormExists(field.form_id);
  requireDraft(form);

  const effectiveType = input.fieldType ?? field.field_type;
  const effectiveOptions = input.optionsJson !== undefined ? input.optionsJson : field.options_json;
  validateOptionsJson(effectiveType, effectiveOptions);

  fieldRepo.update(fieldId, {
    label: input.label,
    fieldType: input.fieldType,
    required: input.required !== undefined ? (input.required ? 1 : 0) : undefined,
    optionsJson: input.optionsJson,
    displayOrder: input.displayOrder,
  });
  return toField(fieldRepo.findById(fieldId)!);
}

export function publishForm(formId: number): Form {
  const form = requireFormExists(formId);
  requireDraft(form);

  // Deactivate any currently ACTIVE version of same study+name
  const currentActive = formRepo.findActiveByStudyName(form.study_id, form.name);
  if (currentActive) {
    formRepo.updateStatus(currentActive.id, 'ARCHIVED');
  }

  formRepo.updateStatus(formId, 'ACTIVE');
  return toForm(formRepo.findById(formId)!);
}

export function createNewFormVersion(formId: number): FormWithFields {
  const form = requireFormExists(formId);

  const nextVersion = formRepo.findMaxVersion(form.study_id, form.name) + 1;
  const newId = formRepo.insert(form.study_id, form.name, nextVersion);

  // Copy fields from source form
  const sourceFields = fieldRepo.findByFormId(formId);
  for (const f of sourceFields) {
    fieldRepo.insert(newId, f.field_key, f.label, f.field_type, f.required, f.options_json, f.display_order);
  }

  const newFields = fieldRepo.findByFormId(newId).map(toField);
  return { ...toForm(formRepo.findById(newId)!), fields: newFields };
}

export function archiveForm(formId: number): Form {
  const form = requireFormExists(formId);
  if (form.status === 'ARCHIVED') return toForm(form);
  formRepo.updateStatus(formId, 'ARCHIVED');
  return toForm(formRepo.findById(formId)!);
}
