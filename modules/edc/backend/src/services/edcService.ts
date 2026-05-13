import { GraphQLError } from 'graphql';
import * as instanceRepo from '../repositories/formInstanceRepository';
import * as responseRepo from '../repositories/formResponseRepository';
import * as crossRepo from '../repositories/crossModuleRepository';
import { TfFormInstanceRow, TfFormResponseRow, TfFormFieldRow, FieldType, FormInstanceStatus } from '../types';
import { throwBadUserInput, FieldErrors } from '../validation/helpers';

// --- DTOs ---

export interface FormInstance {
  id: number;
  patientVisitId: number;
  formId: number;
  status: FormInstanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FormInstanceWithResponse extends FormInstance {
  response: FormResponse | null;
}

export interface FormResponse {
  id: number;
  formInstanceId: number;
  responseJson: string;
  savedAt: string;
  submittedAt: string | null;
}

function toInstance(row: TfFormInstanceRow): FormInstance {
  return {
    id: row.id,
    patientVisitId: row.patient_visit_id,
    formId: row.form_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toResponse(row: TfFormResponseRow): FormResponse {
  return {
    id: row.id,
    formInstanceId: row.form_instance_id,
    responseJson: row.response_json,
    savedAt: row.saved_at,
    submittedAt: row.submitted_at,
  };
}

// --- Response Validation ---

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateResponseData(data: Record<string, unknown>, fields: TfFormFieldRow[], strict: boolean): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of fields) {
    const value = data[field.field_key];
    const isPresent = value !== undefined && value !== null && value !== '';

    if (strict && field.required === 1 && !isPresent) {
      errors[field.field_key] = `${field.label} is required`;
      continue;
    }

    if (!isPresent) continue;

    switch (field.field_type as FieldType) {
      case 'NUMBER':
        if (typeof value !== 'number') {
          errors[field.field_key] = `${field.label} must be a number`;
        }
        break;
      case 'DATE':
        if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
          errors[field.field_key] = `${field.label} must be YYYY-MM-DD`;
        }
        break;
      case 'CHECKBOX':
        if (typeof value !== 'boolean') {
          errors[field.field_key] = `${field.label} must be a boolean`;
        }
        break;
      case 'DROPDOWN':
      case 'RADIO': {
        if (typeof value !== 'string') {
          errors[field.field_key] = `${field.label} must be a string`;
          break;
        }
        if (field.options_json) {
          const options = JSON.parse(field.options_json) as string[];
          if (!options.includes(value)) {
            errors[field.field_key] = `${field.label} must be one of: ${options.join(', ')}`;
          }
        }
        break;
      }
      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') {
          errors[field.field_key] = `${field.label} must be a string`;
        }
        break;
    }
  }

  return errors;
}

// --- Queries ---

export function getFormInstancesByVisit(patientVisitId: number): FormInstance[] {
  return instanceRepo.findByVisitId(patientVisitId).map(toInstance);
}

export function getFormInstance(id: number): FormInstanceWithResponse {
  const row = instanceRepo.findById(id);
  if (!row) throw new GraphQLError('Form instance not found', { extensions: { code: 'NOT_FOUND' } });
  const resp = responseRepo.findByInstanceId(id);
  return { ...toInstance(row), response: resp ? toResponse(resp) : null };
}

// --- Mutations ---

export function createFormInstance(patientVisitId: number): FormInstance {
  // Validate visit exists and is not ARCHIVED/CANCELLED
  const visit = crossRepo.findPatientVisitById(patientVisitId);
  if (!visit) throw new GraphQLError('Patient visit not found', { extensions: { code: 'NOT_FOUND' } });
  if (visit.status === 'ARCHIVED' || visit.status === 'CANCELLED') {
    throwBadUserInput(
      { patientVisitId: `Cannot create form instance for ${visit.status} visit` },
      `Visit is ${visit.status}`
    );
  }

  // Resolve study from visit -> studySubject
  const ss = crossRepo.findStudySubjectById(visit.study_subject_id);
  if (!ss) throw new GraphQLError('Study subject not found', { extensions: { code: 'NOT_FOUND' } });

  // Find the ONE ACTIVE form for this study
  // study_id in tf_forms is integer; study_id in tf_study_subjects is TEXT like "STUDY-001"
  // Convention: we parse the numeric part or use a mapping. For v0.6, studyId integer = 1 maps to "STUDY-001".
  // We'll extract numeric studyId by convention: parseInt from study_id string suffix, or just use 1 for "STUDY-001".
  const studyIdInt = parseStudyIdToInt(ss.study_id);
  const activeForm = crossRepo.findActiveFormForStudy(studyIdInt);
  if (!activeForm) {
    throwBadUserInput(
      { patientVisitId: 'No ACTIVE form exists for this study' },
      'No active form for study'
    );
  }

  // Check duplicate
  const existing = instanceRepo.findExisting(patientVisitId, activeForm.id);
  if (existing) {
    throwBadUserInput(
      { patientVisitId: 'Form instance already exists for this visit' },
      'Duplicate form instance'
    );
  }

  const id = instanceRepo.insert(patientVisitId, activeForm.id);
  return toInstance(instanceRepo.findById(id)!);
}

export function saveFormResponse(formInstanceId: number, responseJson: string): FormInstanceWithResponse {
  const instance = instanceRepo.findById(formInstanceId);
  if (!instance) throw new GraphQLError('Form instance not found', { extensions: { code: 'NOT_FOUND' } });

  if (instance.status !== 'DRAFT') {
    throwBadUserInput(
      { formInstanceId: `Cannot save response for ${instance.status} instance` },
      `Instance is ${instance.status}`
    );
  }

  // Parse JSON
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseJson);
  } catch {
    throwBadUserInput({ responseJson: 'Invalid JSON' }, 'Invalid JSON');
  }

  // Validate field types (non-strict: don't enforce required on save)
  const fields = crossRepo.findFormFields(instance.form_id);
  const errors = validateResponseData(data, fields, false);
  if (Object.keys(errors).length > 0) {
    throwBadUserInput(errors, 'Response validation failed');
  }

  responseRepo.upsert(formInstanceId, responseJson);
  return getFormInstance(formInstanceId);
}

export function submitFormInstance(formInstanceId: number): FormInstanceWithResponse {
  const instance = instanceRepo.findById(formInstanceId);
  if (!instance) throw new GraphQLError('Form instance not found', { extensions: { code: 'NOT_FOUND' } });

  if (instance.status !== 'DRAFT') {
    throwBadUserInput(
      { formInstanceId: `Cannot submit a ${instance.status} instance` },
      `Instance is ${instance.status}`
    );
  }

  // Must have a response saved
  const resp = responseRepo.findByInstanceId(formInstanceId);
  if (!resp) {
    throwBadUserInput(
      { formInstanceId: 'No response saved yet' },
      'No response to submit'
    );
  }

  // Strict validation: required fields must be present
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(resp.response_json);
  } catch {
    throwBadUserInput({ responseJson: 'Stored response is invalid JSON' }, 'Invalid stored response');
  }

  const fields = crossRepo.findFormFields(instance.form_id);
  const errors = validateResponseData(data, fields, true);
  if (Object.keys(errors).length > 0) {
    throwBadUserInput(errors, 'Submission validation failed');
  }

  instanceRepo.updateStatus(formInstanceId, 'SUBMITTED');
  responseRepo.setSubmitted(formInstanceId);
  return getFormInstance(formInstanceId);
}

export function archiveFormInstance(formInstanceId: number): FormInstance {
  const instance = instanceRepo.findById(formInstanceId);
  if (!instance) throw new GraphQLError('Form instance not found', { extensions: { code: 'NOT_FOUND' } });
  if (instance.status === 'ARCHIVED') return toInstance(instance);
  instanceRepo.updateStatus(formInstanceId, 'ARCHIVED');
  return toInstance(instanceRepo.findById(formInstanceId)!);
}

// --- Helpers ---

/** Maps string study_id (e.g. "STUDY-001") to integer for form lookup. */
function parseStudyIdToInt(studyId: string): number {
  const match = studyId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}
