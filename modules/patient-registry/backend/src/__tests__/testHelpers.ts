import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { JwtPayload, RoleName } from '../types';

/** Boots an in-memory SQLite DB with the full patient-registry schema + seed data. */
export function setupTestDb(): void {
  initConnection(':memory:');
  initDb();
}

/** Creates a mock JWT payload for testing resolver context. */
export function mockUser(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    userId: 1,
    email: 'admin@trialforge.io',
    roles: ['ADMIN'] as RoleName[],
    ...overrides,
  };
}
