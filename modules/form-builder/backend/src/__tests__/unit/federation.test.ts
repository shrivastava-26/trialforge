import { describe, it, expect, beforeAll } from 'vitest';
import { graphql } from 'graphql';
import { setupTestDb, mockUser } from '../testHelpers';
import { schema } from '../../federation/schema';
import { GraphQLContext } from '../../types';

function makeContext(user = mockUser()): GraphQLContext {
  return { user, req: {} as any, res: {} as any };
}

function noAuthContext(): GraphQLContext {
  return { user: null, req: {} as any, res: {} as any };
}

beforeAll(() => {
  setupTestDb();
});

describe('form-builder federation resolvers', () => {
  describe('Study.forms', () => {
    it('returns paginated forms for a study', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "Study", id: "1" }]) {
              ... on Study {
                forms(page: 1, pageSize: 10) {
                  rows { id name version status }
                  total
                }
              }
            }
          }
        `,
        contextValue: makeContext(),
      });

      expect(result.errors).toBeUndefined();
      const study = (result.data as any)._entities[0];
      expect(study.forms.total).toBe(2);
      expect(study.forms.rows).toHaveLength(2);
      expect(study.forms.rows[0]).toHaveProperty('name');
    });

    it('filters by status', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "Study", id: "1" }]) {
              ... on Study {
                forms(status: "ACTIVE") {
                  rows { id name status }
                  total
                }
              }
            }
          }
        `,
        contextValue: makeContext(),
      });

      expect(result.errors).toBeUndefined();
      const study = (result.data as any)._entities[0];
      expect(study.forms.total).toBe(1);
      expect(study.forms.rows[0].status).toBe('ACTIVE');
    });

    it('rejects unauthenticated requests', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "Study", id: "1" }]) {
              ... on Study {
                forms { rows { id } total }
              }
            }
          }
        `,
        contextValue: noAuthContext(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('FormInstance.form', () => {
    it('resolves form from formId', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "FormInstance", id: "99", formId: "1" }]) {
              ... on FormInstance {
                form { id name version status studyId }
              }
            }
          }
        `,
        contextValue: makeContext(),
      });

      expect(result.errors).toBeUndefined();
      const instance = (result.data as any)._entities[0];
      expect(instance.form.id).toBe('1');
      expect(instance.form.name).toBe('Demographics');
      expect(instance.form.studyId).toBe('1');
    });

    it('rejects unauthenticated requests', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "FormInstance", id: "99", formId: "1" }]) {
              ... on FormInstance {
                form { id }
              }
            }
          }
        `,
        contextValue: noAuthContext(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Study.forms with role-only token (no roles array)', () => {
    it('does not crash when user has only role string', async () => {
      const user = { id: '2', userId: 2, email: 'user@test.io', role: 'ADMIN' } as any;
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "Study", id: "1" }]) {
              ... on Study {
                forms(page: 1, pageSize: 10) {
                  rows { id name version status }
                  total
                }
              }
            }
          }
        `,
        contextValue: { user, req: {} as any, res: {} as any },
      });

      expect(result.errors).toBeUndefined();
      const study = (result.data as any)._entities[0];
      expect(study.forms).toHaveProperty('total');
      expect(study.forms).toHaveProperty('rows');
    });
  });

  describe('Form __resolveReference', () => {
    it('resolves Form by id', async () => {
      const result = await graphql({
        schema,
        source: `
          query {
            _entities(representations: [{ __typename: "Form", id: "1" }]) {
              ... on Form {
                id name version status studyId createdAt updatedAt
              }
            }
          }
        `,
        contextValue: makeContext(),
      });

      expect(result.errors).toBeUndefined();
      const form = (result.data as any)._entities[0];
      expect(form.id).toBe('1');
      expect(form.name).toBe('Demographics');
      expect(form.version).toBe(1);
    });
  });
});
