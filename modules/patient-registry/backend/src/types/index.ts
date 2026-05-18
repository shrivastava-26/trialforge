import { Request, Response } from 'express';
import { JwtPayload } from '@trialforge/shared-auth';

export type { JwtPayload } from '@trialforge/shared-auth';

export type PatientStatus = 'SCREENED' | 'ELIGIBLE' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'ARCHIVED';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfPatientRow {
  id: number;
  subject_id: string;
  status: PatientStatus;
  created_at: string;
  updated_at: string;
}

export interface TfStudySubjectRow {
  id: number;
  study_id: string;
  site_id: string;
  patient_id: number;
  status: PatientStatus;
  assigned_at: string;
}

export interface GraphQLContext {
  user: JwtPayload | null;
  req: Request;
  res: Response;
}

/**
 * Forward-only status transitions for patients and study subjects.
 * SCREENED → ELIGIBLE → ENROLLED → (WITHDRAWN | COMPLETED) → ARCHIVED
 */
export const VALID_STATUS_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  SCREENED: ['ELIGIBLE', 'ARCHIVED'],
  ELIGIBLE: ['ENROLLED', 'ARCHIVED'],
  ENROLLED: ['WITHDRAWN', 'COMPLETED', 'ARCHIVED'],
  WITHDRAWN: ['ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [], // terminal
};
