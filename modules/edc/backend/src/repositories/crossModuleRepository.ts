import { queryAll, queryOne } from '../db/query';
import { TfPatientVisitRow, TfStudySubjectRow, TfFormRow, TfFormFieldRow } from '../types';

export function findPatientVisitById(id: number): TfPatientVisitRow | undefined {
  return queryOne<TfPatientVisitRow>('SELECT * FROM tf_patient_visits WHERE id = ?', [id]);
}

export function findStudySubjectById(id: number): TfStudySubjectRow | undefined {
  return queryOne<TfStudySubjectRow>('SELECT * FROM tf_study_subjects WHERE id = ?', [id]);
}

export function findActiveFormForStudy(studyId: number): TfFormRow | undefined {
  return queryOne<TfFormRow>("SELECT * FROM tf_forms WHERE study_id = ? AND status = 'ACTIVE' LIMIT 1", [studyId]);
}

export function findFormById(id: number): TfFormRow | undefined {
  return queryOne<TfFormRow>('SELECT * FROM tf_forms WHERE id = ?', [id]);
}

export function findFormFields(formId: number): TfFormFieldRow[] {
  return queryAll<TfFormFieldRow>('SELECT * FROM tf_form_fields WHERE form_id = ? ORDER BY display_order ASC', [formId]);
}
