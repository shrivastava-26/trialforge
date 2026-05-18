import { Request, Response } from 'express';
import { JwtPayload as SharedJwtPayload } from '@trialforge/shared-auth';

export type DocumentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type VersionStatus = 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type DocumentCategory = 'Protocol' | 'ICF' | 'TMF' | 'Other';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfDocumentRow {
  id: number;
  study_id: number;
  title: string;
  category: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface TfDocumentVersionRow {
  id: number;
  document_id: number;
  version_number: number;
  file_ref: string;
  status: VersionStatus;
  created_at: string;
}

export type JwtPayload = SharedJwtPayload & { userId?: number };

export interface GraphQLContext {
  user: JwtPayload | null;
  req: Request;
  res: Response;
}
