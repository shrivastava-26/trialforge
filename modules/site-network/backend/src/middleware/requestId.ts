import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Augment Express Request so req.requestId is typed throughout the app
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
