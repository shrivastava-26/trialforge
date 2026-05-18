import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import type { JwtPayload } from '@trialforge/shared-auth';

export function setupTestDb(): void {
  initConnection(':memory:');
  initDb();
}

export function mockUser(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    id: '1',
    email: 'admin@trialforge.io',
    roles: ['ADMIN'],
    ...overrides,
  };
}
