import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { JwtPayload, RoleName } from '../types';

export function setupTestDb(): void {
  initConnection(':memory:');
  initDb();
}

export function mockUser(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    id: '1',
    userId: 1,
    email: 'admin@trialforge.io',
    roles: ['ADMIN'] as RoleName[],
    ...overrides,
  };
}
