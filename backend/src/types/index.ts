import { Response } from 'express';

export interface UserRow {
  id: number;
  email: string;
  password: string;
  role: 'ADMIN' | 'VIEWER';
}

export interface StudyRow {
  id: number;
  protocolId: string;
  title: string;
  sponsor: string;
  phase: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
}

export interface SiteRow {
  id: number;
  siteCode: string;
  name: string;
  city: string;
  country: string;
  status: string;
}

export interface ExaminerRow {
  id: number;
  examinerCode: string;
  name: string;
  specialty: string;
  email: string;
  role: string;
  status: string;
}

export interface AuditLogRow {
  id: number;
  actorUserId: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}

export interface JwtPayload {
  userId: number;
  role: 'ADMIN' | 'VIEWER';
  email: string;
}

export interface GraphQLContext {
  user: JwtPayload | null;
  res: Response;
}
