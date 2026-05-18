import { Request, Response } from 'express';
import type { JwtPayload, AuthContext } from '@trialforge/shared-auth';

export type { JwtPayload };

export type QueryStatus = 'OPEN' | 'ANSWERED' | 'CLOSED' | 'ARCHIVED';
export type MessageAuthorRole = 'DATA_MANAGER' | 'SITE_COORDINATOR' | 'ADMIN';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfQueryRow {
  id: number;
  form_instance_id: number;
  title: string;
  description: string;
  status: QueryStatus;
  created_at: string;
  updated_at: string;
}

export interface TfQueryMessageRow {
  id: number;
  query_id: number;
  message: string;
  author_role: MessageAuthorRole;
  created_at: string;
}

// Cross-module mirror
export interface TfFormInstanceRow {
  id: number;
  patient_visit_id: number;
  form_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GraphQLContext extends AuthContext {
  user: JwtPayload | null;
  req: Request;
  res: Response;
}
