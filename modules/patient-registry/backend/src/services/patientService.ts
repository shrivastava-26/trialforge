import { GraphQLError } from 'graphql';
import * as patientRepo from '../repositories/patientRepository';
import * as studySubjectRepo from '../repositories/studySubjectRepository';
import { PatientStatus, TfPatientRow, TfStudySubjectRow, VALID_STATUS_TRANSITIONS } from '../types';
import { throwBadUserInput } from '../validation/helpers';

export interface Patient {
  id: number;
  subjectId: string;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientWithAssignments extends Patient {
  assignments: StudySubject[];
}

export interface StudySubject {
  id: number;
  studyId: string;
  siteId: string;
  patientId: number;
  status: PatientStatus;
  assignedAt: string;
}

function toPatient(row: TfPatientRow): Patient {
  return {
    id: row.id,
    subjectId: row.subject_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStudySubject(row: TfStudySubjectRow): StudySubject {
  return {
    id: row.id,
    studyId: row.study_id,
    siteId: row.site_id,
    patientId: row.patient_id,
    status: row.status,
    assignedAt: row.assigned_at,
  };
}

function validateTransition(current: PatientStatus, next: PatientStatus): void {
  const allowed = VALID_STATUS_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throwBadUserInput(
      { status: `Cannot transition from ${current} to ${next}` },
      `Invalid status transition: ${current} → ${next}`
    );
  }
}

export function getPatients(
  page: number,
  pageSize: number,
  filters?: { status?: PatientStatus }
): { rows: Patient[]; total: number } {
  const { rows, total } = patientRepo.findAll(page, pageSize, filters);
  return { rows: rows.map(toPatient), total };
}

export function getPatient(id: number): PatientWithAssignments {
  const row = patientRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const assignments = studySubjectRepo.findByPatientId(id).map(toStudySubject);
  return { ...toPatient(row), assignments };
}

export function createPatient(subjectId: string): Patient {
  const normalized = subjectId.trim().toUpperCase();
  const existing = patientRepo.findBySubjectId(normalized);
  if (existing) {
    throwBadUserInput({ subjectId: 'Subject ID already exists' }, 'Duplicate subject ID');
  }
  const id = patientRepo.insert(normalized);
  return toPatient(patientRepo.findById(id)!);
}

export function updatePatient(
  id: number,
  input: { subjectId?: string; status?: PatientStatus }
): Patient {
  const row = patientRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient not found', { extensions: { code: 'NOT_FOUND' } });
  }

  if (input.subjectId) {
    const normalized = input.subjectId.trim().toUpperCase();
    const dup = patientRepo.findBySubjectId(normalized);
    if (dup && dup.id !== id) {
      throwBadUserInput({ subjectId: 'Subject ID already exists' }, 'Duplicate subject ID');
    }
    patientRepo.updateSubjectId(id, normalized);
  }

  if (input.status && input.status !== row.status) {
    validateTransition(row.status, input.status);
    patientRepo.updateStatus(id, input.status);
  }

  return toPatient(patientRepo.findById(id)!);
}

export function archivePatient(id: number): Patient {
  const row = patientRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (row.status === 'ARCHIVED') {
    return toPatient(row);
  }
  validateTransition(row.status, 'ARCHIVED');
  patientRepo.updateStatus(id, 'ARCHIVED');
  return toPatient(patientRepo.findById(id)!);
}

export function assignPatientToStudySite(
  patientId: number,
  studyId: string,
  siteId: string
): StudySubject {
  const patient = patientRepo.findById(patientId);
  if (!patient) {
    throw new GraphQLError('Patient not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (patient.status === 'ARCHIVED') {
    throwBadUserInput(
      { patientId: 'Cannot assign an ARCHIVED patient' },
      'Cannot assign an ARCHIVED patient'
    );
  }

  // TODO: In future, validate studyId/siteId exist via site-network GraphQL call.
  // For v0.3, we allow any non-empty studyId/siteId.

  const existing = studySubjectRepo.findExisting(studyId, siteId, patientId);
  if (existing) {
    throwBadUserInput(
      { patientId: 'Patient already assigned to this study/site combination' },
      'Duplicate assignment'
    );
  }

  const id = studySubjectRepo.insert(studyId, siteId, patientId);
  return toStudySubject(studySubjectRepo.findById(id)!);
}

export function updateStudySubjectStatus(id: number, status: PatientStatus): StudySubject {
  const row = studySubjectRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Study subject not found', { extensions: { code: 'NOT_FOUND' } });
  }
  validateTransition(row.status, status);
  studySubjectRepo.updateStatus(id, status);
  return toStudySubject(studySubjectRepo.findById(id)!);
}

export function getStudySubjects(
  studyId: string,
  siteId: string | undefined,
  page: number,
  pageSize: number
): { rows: StudySubject[]; total: number } {
  const { rows, total } = studySubjectRepo.findByStudySite(studyId, siteId, page, pageSize);
  return { rows: rows.map(toStudySubject), total };
}

export function getStudySubjectsBySite(
  siteId: string,
  page: number,
  pageSize: number
): { rows: StudySubject[]; total: number } {
  const { rows, total } = studySubjectRepo.findBySite(siteId, page, pageSize);
  return { rows: rows.map(toStudySubject), total };
}

export function getStudySubjectById(id: number): StudySubject | undefined {
  const row = studySubjectRepo.findById(id);
  return row ? toStudySubject(row) : undefined;
}
