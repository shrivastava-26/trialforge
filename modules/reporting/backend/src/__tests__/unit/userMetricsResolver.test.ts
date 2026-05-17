import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, mockUser } from '../testHelpers';
import { resolvers } from '../../graphql/resolvers';
import type { GraphQLContext } from '../../types';

function makeContext(roles: string[] = ['ADMIN']): GraphQLContext {
  return {
    user: mockUser({ roles: roles as any }),
    req: {} as any,
    res: {} as any,
  };
}

describe('User.metrics resolver', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('returns valid DashboardMetrics shape with no filters', () => {
    const ctx = makeContext(['ADMIN']);
    const result = resolvers.User.metrics({ id: '1' }, {}, ctx);

    expect(result).toMatchObject({
      patientsTotal: expect.any(Number),
      patientsEnrolled: expect.any(Number),
      patientsArchived: expect.any(Number),
      visitsPlanned: expect.any(Number),
      visitsCompleted: expect.any(Number),
      visitsMissed: expect.any(Number),
      formsActive: expect.any(Number),
      formInstancesDraft: expect.any(Number),
      formInstancesSubmitted: expect.any(Number),
      queriesOpen: expect.any(Number),
      queriesAnswered: expect.any(Number),
      queriesClosed: expect.any(Number),
      documentsTotal: expect.any(Number),
      documentsArchived: expect.any(Number),
      documentVersionsTotal: expect.any(Number),
    });
  });

  it('accepts studyId filter', () => {
    const ctx = makeContext(['ADMIN']);
    const result = resolvers.User.metrics({ id: '1' }, { studyId: 'STUDY-001' }, ctx);

    expect(result.patientsTotal).toBeGreaterThanOrEqual(0);
    expect(result.documentsTotal).toBeGreaterThanOrEqual(0);
  });

  it('accepts studyId and siteId filters', () => {
    const ctx = makeContext(['SITE_COORDINATOR']);
    const result = resolvers.User.metrics({ id: '1' }, { studyId: 'STUDY-001', siteId: 'SITE-A' }, ctx);

    expect(result.patientsEnrolled).toBeGreaterThanOrEqual(0);
  });

  it('enforces RBAC — unauthenticated throws UNAUTHENTICATED', () => {
    const ctx: GraphQLContext = { user: null, req: {} as any, res: {} as any };

    expect(() => resolvers.User.metrics({ id: '1' }, {}, ctx)).toThrow(/Unauthorized/);
  });

  it('enforces RBAC — unauthorized role throws FORBIDDEN', () => {
    const ctx = makeContext(['UNKNOWN_ROLE' as any]);

    expect(() => resolvers.User.metrics({ id: '1' }, {}, ctx)).toThrow(/Forbidden/);
  });

  it('returns same data as getDashboardMetrics query for same filters', () => {
    const ctx = makeContext(['ADMIN']);
    const fromQuery = resolvers.Query.getDashboardMetrics(null, { studyId: 'STUDY-001' }, ctx);
    const fromUser = resolvers.User.metrics({ id: '1' }, { studyId: 'STUDY-001' }, ctx);

    expect(fromUser).toEqual(fromQuery);
  });
});
