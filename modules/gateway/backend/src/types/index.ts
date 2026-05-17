import type { Request, Response } from 'express';

export interface GatewayContext {
  req: Request;
  res: Response;
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
