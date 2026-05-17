import type { Request, Response } from 'express';

export type Role = 'ADMIN' | 'STUDY_MANAGER' | 'SITE_COORDINATOR';

export interface GatewayContext {
  req: Request;
  res: Response;
  user?: { id: string; email: string; role: Role };
}

export interface DownstreamResponse {
  data?: Record<string, unknown>;
  errors?: DownstreamError[];
  headers: Headers;
}

export interface DownstreamError {
  message: string;
  extensions?: { code?: string; [key: string]: unknown };
  path?: string[];
  locations?: Array<{ line: number; column: number }>;
}
