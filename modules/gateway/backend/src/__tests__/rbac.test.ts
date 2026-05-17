import { describe, it, expect } from 'vitest';
import { requireAuth, requireRole } from '../services/authService';
import type { GatewayContext, Role } from '../types';
import type { Request, Response } from 'express';

function makeCtx(user?: { id: string; email: string; role: Role }): GatewayContext {
  return { req: {} as Request, res: {} as Response, user };
}

describe('authService', () => {
  describe('requireAuth', () => {
    it('throws UNAUTHENTICATED when no user', () => {
      expect(() => requireAuth(makeCtx())).toThrow();
      try { requireAuth(makeCtx()); } catch (e: any) {
        expect(e.extensions.code).toBe('UNAUTHENTICATED');
      }
    });

    it('returns user when present', () => {
      const user = { id: '1', email: 'a@b.com', role: 'ADMIN' as Role };
      expect(requireAuth(makeCtx(user))).toEqual(user);
    });
  });

  describe('requireRole', () => {
    it('throws FORBIDDEN when role not in allowed list', () => {
      const user = { id: '1', email: 'a@b.com', role: 'SITE_COORDINATOR' as Role };
      try { requireRole(makeCtx(user), ['ADMIN']); } catch (e: any) {
        expect(e.extensions.code).toBe('FORBIDDEN');
      }
    });

    it('passes when role is in allowed list', () => {
      const user = { id: '1', email: 'a@b.com', role: 'STUDY_MANAGER' as Role };
      expect(requireRole(makeCtx(user), ['ADMIN', 'STUDY_MANAGER'])).toEqual(user);
    });

    it('throws UNAUTHENTICATED when no user even if roles provided', () => {
      try { requireRole(makeCtx(), ['ADMIN']); } catch (e: any) {
        expect(e.extensions.code).toBe('UNAUTHENTICATED');
      }
    });
  });
});
