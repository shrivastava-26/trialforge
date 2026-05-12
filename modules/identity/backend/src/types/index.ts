import { Request, Response } from 'express';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface TfUserRow {
  id: number;
  email: string;
  password_hash: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface TfRoleRow {
  id: number;
  name: RoleName;
}

export interface TfUserRoleRow {
  user_id: number;
  role_id: number;
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
