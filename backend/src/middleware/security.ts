import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
});

// General GraphQL rate limit: 500 requests per minute per IP.
export const graphqlRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false, 
  message: { errors: [{ message: 'Too many requests, please try again later.', extensions: { code: 'RATE_LIMITED' } }] },
});

// Login rate limit: 20 attempts per 15 minutes per IP+email combination.
// Keyed on IP+email so viewer attempts never block admin attempts from the same machine.
const loginLimiterMap = new Map<string, ReturnType<typeof rateLimit>>();

function getLoginLimiter(key: string): ReturnType<typeof rateLimit> {
  if (!loginLimiterMap.has(key)) {
    loginLimiterMap.set(
      key,
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: () => key,
        message: { errors: [{ message: 'Too many login attempts for this account from your device. Please wait 15 minutes and try again.', extensions: { code: 'RATE_LIMITED' } }] },
      })
    );
  }
  return loginLimiterMap.get(key)!;
}

// Middleware: only rate-limits the login mutation, keyed by IP+email.
export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  // Only intercept login mutations — let everything else through immediately
  const body = req.body as { operationName?: string; variables?: { email?: string } } | undefined;
  const isLoginMutation = body?.operationName === 'Login' ||
    (typeof req.body?.query === 'string' && (req.body.query as string).includes('login('));

  if (!isLoginMutation) {
    next();
    return;
  }

  const email = (body?.variables?.email ?? '').toLowerCase().trim();
  const ip = req.ip ?? 'unknown';
  // Key = IP + email — viewer and admin are tracked independently even on the same machine
  const key = `login:${ip}:${email}`;
  getLoginLimiter(key)(req, res, next);
}
