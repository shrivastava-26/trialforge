import { Request, Response } from 'express';

export type VisitTemplateStatus = 'ACTIVE' | 'ARCHIVED';
export type PatientVisitStatus = 'PLANNED' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'ARCHIVED';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfVisitTemplateRow {
  id: number;
  study_id: number;
  name: string;
  day_offset: number;
  window_min_days: number;
  window_max_days: number;
  status: VisitTemplateStatus;
}

export interface TfPatientVisitRow {
  id: number;
  study_subject_id: number;
  visit_template_id: number;
  scheduled_date: string;
  completed_date: string | null;
  status: PatientVisitStatus;
}

/** Mirrors patient-registry tf_study_subjects for cross-module validation. */
export interface TfStudySubjectRow {
  id: number;
  study_id: string;
  site_id: string;
  patient_id: number;
  status: string;
  assigned_at: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  roles: RoleName[];
}

export interface GraphQLContext {
  user: JwtPayload | null;
  req: Request;
  res: Response;
}

/**
 * Forward-only visit status transitions:
 * PLANNED → COMPLETED | MISSED | CANCELLED → ARCHIVED
 */
export const VALID_VISIT_TRANSITIONS: Record<PatientVisitStatus, PatientVisitStatus[]> = {
  PLANNED: ['COMPLETED', 'MISSED', 'CANCELLED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  MISSED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};
