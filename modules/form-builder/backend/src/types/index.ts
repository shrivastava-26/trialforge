import { Request, Response } from 'express';

export type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'RADIO' | 'CHECKBOX' | 'TEXTAREA';

export const OPTIONS_REQUIRED_TYPES: FieldType[] = ['DROPDOWN', 'RADIO'];

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfFormRow {
  id: number;
  study_id: number;
  name: string;
  version: number;
  status: FormStatus;
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
