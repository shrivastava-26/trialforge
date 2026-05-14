import { Request, Response } from 'express';

export type RoleName =
  | 'ADMIN'
  | 'CRO_MANAGER'
  | 'SITE_COORDINATOR'
  | 'DATA_MANAGER'
  | 'MONITOR'
  | 'AUDITOR';

export interface DashboardMetrics {
  patientsTotal: number;
  patientsEnrolled: number;
  patientsArchived: number;
  visitsPlanned: number;
  visitsCompleted: number;
  visitsMissed: number;
  formsActive: number;
  formInstancesDraft: number;
  formInstancesSubmitted: number;
  queriesOpen: number;
  queriesAnswered: number;
  queriesClosed: number;
  documentsTotal: number;
  documentsArchived: number;
  documentVersionsTotal: number;
}

export interface MetricsFilter {
  studyId?: string;
  siteId?: string;
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
