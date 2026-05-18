import { Request, Response } from 'express';
import { JwtPayload as SharedJwtPayload } from '@trialforge/shared-auth';

export type FormInstanceStatus = 'DRAFT' | 'SUBMITTED' | 'ARCHIVED';
export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'RADIO' | 'CHECKBOX' | 'TEXTAREA';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfFormInstanceRow {
  id: number;
  patient_visit_id: number;
  form_id: number;
  status: FormInstanceStatus;
  created_at: string;
  updated_at: string;
}

export interface TfFormResponseRow {
  id: number;
  form_instance_id: number;
  response_json: string;
  saved_at: string;
  submitted_at: string | null;
}

// Cross-module mirror tables
export interface TfPatientVisitRow {
  id: number;
  study_subject_id: number;
  visit_template_id: number;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
}

export interface TfStudySubjectRow {
  id: number;
  study_id: string;
  site_id: string;
  patient_id: number;
  status: string;
  assigned_at: string;
}

export interface TfFormRow {
  id: number;
  study_id: number;
  name: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TfFormFieldRow {
  id: number;
  form_id: number;
  field_key: string;
  label: string;
  field_type: FieldType;
  required: number;
  options_json: string | null;
  display_order: number;
}

/**
 * EDC-specific JwtPayload extends shared-auth's base type with userId.
 * Supports both `role` (single) and `roles` (array) via shared-auth normalizeRoles.
 */
export interface JwtPayload extends SharedJwtPayload {
  userId: number;
  roles: RoleName[];
}
export interface GraphQLContext {
  user: JwtPayload | null;
  req: Request;
  res: Response;
  requestId: string;
}
