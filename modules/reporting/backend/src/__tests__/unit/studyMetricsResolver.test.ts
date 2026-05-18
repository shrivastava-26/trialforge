import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, mockUser } from '../testHelpers';
import { resolvers } from '../../graphql/resolvers';
import type { GraphQLContext } from '../../types';

function makeContext(roles: string[] = ['ADMIN']): GraphQLContext {
  return {
    user: mockUser({ roles }),
    req: {} as any,
    res: {} as any,
  };
}

describe('Study.metrics resolver', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('returns valid DashboardMetrics shape', () => {
    const ctx = makeContext(['ADMIN']);
    const result = resolvers.Study.metrics({ id: 'STUDY-001' }, {}, ctx);

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

  it('passes parent.id as studyId filter', () => {
    const ctx = makeContext(['ADMIN']);
    const fromStudy = resolvers.Study.metrics({ id: 'STUDY-001' }, {}, ctx);
    const fromQuery = resolvers.Query.getDashboardMetrics(null, { studyId: 'STUDY-001' }, ctx);

    expect(fromStudy).toEqual(fromQuery);
  });

  it('accepts optional siteId filter', () => {
    const ctx = makeContext(['SITE_COORDINATOR']);
    const result = resolvers.Study.metrics({ id: 'STUDY-001' }, { siteId: 'SITE-A' }, ctx);

    expect(result.patientsEnrolled).toBeGreaterThanOrEqual(0);
    expect(result.visitsCompleted).toBeGreaterThanOrEqual(0);
  });

  it('combines parent.id + siteId and matches getDashboardMetrics', () => {
    const ctx = makeContext(['ADMIN']);
    const fromStudy = resolvers.Study.metrics({ id: 'STUDY-001' }, { siteId: 'SITE-A' }, ctx);
    const fromQuery = resolvers.Query.getDashboardMetrics(null, { studyId: 'STUDY-001', siteId: 'SITE-A' }, ctx);

    expect(fromStudy).toEqual(fromQuery);
  });

  it('enforces RBAC — unauthenticated throws UNAUTHENTICATED', () => {
    const ctx: GraphQLContext = { user: null, req: {} as any, res: {} as any };

    expect(() => resolvers.Study.metrics({ id: 'STUDY-001' }, {}, ctx)).toThrow(/Not authenticated/);
  });

  it('enforces RBAC — unauthorized role throws FORBIDDEN', () => {
    const ctx = makeContext(['UNKNOWN_ROLE']);

    expect(() => resolvers.Study.metrics({ id: 'STUDY-001' }, {}, ctx)).toThrow(/Forbidden/);
  });
});
