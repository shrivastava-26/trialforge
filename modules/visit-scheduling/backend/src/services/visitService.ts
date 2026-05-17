import { GraphQLError } from 'graphql';
import * as templateRepo from '../repositories/visitTemplateRepository';
import * as visitRepo from '../repositories/patientVisitRepository';
import * as studySubjectRepo from '../repositories/studySubjectRepository';
import {
  TfVisitTemplateRow,
  TfPatientVisitRow,
  PatientVisitStatus,
  VALID_VISIT_TRANSITIONS,
} from '../types';
import { throwBadUserInput } from '../validation/helpers';

// --- DTOs ---

export interface VisitTemplate {
  id: number;
  studyId: number;
  name: string;
  dayOffset: number;
  windowMinDays: number;
  windowMaxDays: number;
  status: string;
}

export interface PatientVisit {
  id: number;
  studySubjectId: number;
  visitTemplateId: number;
  scheduledDate: string;
  completedDate: string | null;
  status: string;
}

function toTemplate(row: TfVisitTemplateRow): VisitTemplate {
  return {
    id: row.id,
    studyId: row.study_id,
    name: row.name,
    dayOffset: row.day_offset,
    windowMinDays: row.window_min_days,
    windowMaxDays: row.window_max_days,
    status: row.status,
  };
}

function toVisit(row: TfPatientVisitRow): PatientVisit {
  return {
    id: row.id,
    studySubjectId: row.study_subject_id,
    visitTemplateId: row.visit_template_id,
    scheduledDate: row.scheduled_date,
    completedDate: row.completed_date,
    status: row.status,
  };
}

function validateVisitTransition(current: PatientVisitStatus, next: PatientVisitStatus): void {
  const allowed = VALID_VISIT_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throwBadUserInput(
      { status: `Cannot transition from ${current} to ${next}` },
      `Invalid visit status transition: ${current} → ${next}`
    );
  }
}

// --- Visit Templates ---

export function getVisitTemplates(
  studyId: number,
  page: number,
  pageSize: number
): { rows: VisitTemplate[]; total: number } {
  const { rows, total } = templateRepo.findByStudyId(studyId, page, pageSize);
  return { rows: rows.map(toTemplate), total };
}

export function createVisitTemplate(
  studyId: number,
  input: { name: string; dayOffset: number; windowMinDays: number; windowMaxDays: number }
): VisitTemplate {
  const existing = templateRepo.findByStudyAndName(studyId, input.name);
  if (existing) {
    throwBadUserInput({ name: 'Template name already exists for this study' }, 'Duplicate template name');
  }
  const id = templateRepo.insert(studyId, input.name, input.dayOffset, input.windowMinDays, input.windowMaxDays);
  return toTemplate(templateRepo.findById(id)!);
}

export function updateVisitTemplate(
  id: number,
  input: { name?: string; dayOffset?: number; windowMinDays?: number; windowMaxDays?: number }
): VisitTemplate {
  const row = templateRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Visit template not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (row.status === 'ARCHIVED') {
    throwBadUserInput({ id: 'Cannot edit an ARCHIVED template' }, 'Template is archived');
  }
  if (input.name && input.name !== row.name) {
    const dup = templateRepo.findByStudyAndName(row.study_id, input.name);
    if (dup && dup.id !== id) {
      throwBadUserInput({ name: 'Template name already exists for this study' }, 'Duplicate template name');
    }
  }
  templateRepo.update(id, input);
  return toTemplate(templateRepo.findById(id)!);
}

export function archiveVisitTemplate(id: number): VisitTemplate {
  const row = templateRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Visit template not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (row.status === 'ARCHIVED') return toTemplate(row);
  templateRepo.updateStatus(id, 'ARCHIVED');
  return toTemplate(templateRepo.findById(id)!);
}

// --- Patient Visits ---

export function getPatientVisits(
  studySubjectId: number,
  page: number,
  pageSize: number
): { rows: PatientVisit[]; total: number } {
  const { rows, total } = visitRepo.findByStudySubjectId(studySubjectId, page, pageSize);
  return { rows: rows.map(toVisit), total };
}

export function getPatientVisit(id: number): PatientVisit {
  const row = visitRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient visit not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return toVisit(row);
}

export function schedulePatientVisit(
  studySubjectId: number,
  visitTemplateId: number,
  scheduledDate: string
): PatientVisit {
  // Validate study subject exists and is ENROLLED
  const ss = studySubjectRepo.findById(studySubjectId);
  if (!ss) {
    throw new GraphQLError('Study subject not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (ss.status === 'ARCHIVED') {
    throwBadUserInput(
      { studySubjectId: 'Cannot schedule visits for an ARCHIVED study subject' },
      'Study subject is archived'
    );
  }
  if (ss.status !== 'ENROLLED') {
    throwBadUserInput(
      { studySubjectId: `Study subject must be ENROLLED to schedule visits (current: ${ss.status})` },
      'Study subject not enrolled'
    );
  }

  // Validate template exists and is active
  const template = templateRepo.findById(visitTemplateId);
  if (!template) {
    throw new GraphQLError('Visit template not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (template.status === 'ARCHIVED') {
    throwBadUserInput(
      { visitTemplateId: 'Cannot schedule visits for an ARCHIVED template' },
      'Template is archived'
    );
  }

  // Check duplicate
  const existing = visitRepo.findExisting(studySubjectId, visitTemplateId);
  if (existing) {
    throwBadUserInput(
      { visitTemplateId: 'Visit already scheduled for this subject/template' },
      'Duplicate visit'
    );
  }

  const id = visitRepo.insert(studySubjectId, visitTemplateId, scheduledDate);
  return toVisit(visitRepo.findById(id)!);
}

export function completePatientVisit(id: number, completedDate: string): PatientVisit {
  const row = visitRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient visit not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (row.status !== 'PLANNED') {
    throwBadUserInput(
      { status: `Can only complete a PLANNED visit (current: ${row.status})` },
      'Visit not in PLANNED status'
    );
  }
  if (completedDate < row.scheduled_date) {
    throwBadUserInput(
      { completedDate: 'completedDate must be >= scheduledDate' },
      'completedDate before scheduledDate'
    );
  }
  visitRepo.setCompleted(id, completedDate);
  return toVisit(visitRepo.findById(id)!);
}

export function updatePatientVisitStatus(id: number, status: PatientVisitStatus): PatientVisit {
  const row = visitRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient visit not found', { extensions: { code: 'NOT_FOUND' } });
  }
  validateVisitTransition(row.status, status);
  visitRepo.updateStatus(id, status);
  return toVisit(visitRepo.findById(id)!);
}

export function archivePatientVisit(id: number): PatientVisit {
  const row = visitRepo.findById(id);
  if (!row) {
    throw new GraphQLError('Patient visit not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (row.status === 'ARCHIVED') return toVisit(row);
  validateVisitTransition(row.status, 'ARCHIVED');
  visitRepo.updateStatus(id, 'ARCHIVED');
  return toVisit(visitRepo.findById(id)!);
}

export function getPatientVisitsFiltered(
  studySubjectId: number,
  page: number,
  pageSize: number,
  status?: string
): { rows: PatientVisit[]; total: number } {
  const { rows, total } = visitRepo.findByStudySubjectIdFiltered(studySubjectId, page, pageSize, status);
  return { rows: rows.map(toVisit), total };
}
