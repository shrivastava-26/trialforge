import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { setupTestDb, mockUser } from '../testHelpers';
import { getDb } from '../../db/connection';

let server: ApolloServer;

beforeAll(async () => {
  setupTestDb();
  const { schema } = await import('../../federation/schema');
  server = new ApolloServer({ schema });
  await server.start();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM tf_query_messages');
  db.exec('DELETE FROM tf_queries');
  db.exec('DELETE FROM tf_form_instances');

  db.exec(`
    INSERT INTO tf_form_instances (id, patient_visit_id, form_id, status)
    VALUES (1, 1, 1, 'SUBMITTED');

    INSERT INTO tf_form_instances (id, patient_visit_id, form_id, status)
    VALUES (2, 2, 1, 'DRAFT');

    INSERT INTO tf_queries (id, form_instance_id, title, description, status, created_at, updated_at)
    VALUES (1, 1, 'Missing value', 'Field X is empty', 'OPEN', '2025-01-10 10:00:00', '2025-01-10 10:00:00');

    INSERT INTO tf_queries (id, form_instance_id, title, description, status, created_at, updated_at)
    VALUES (2, 1, 'Clarification needed', 'Please confirm dose', 'CLOSED', '2025-01-11 10:00:00', '2025-01-11 12:00:00');

    INSERT INTO tf_queries (id, form_instance_id, title, description, status, created_at, updated_at)
    VALUES (3, 1, 'Data inconsistency', 'Weight vs BMI mismatch', 'OPEN', '2025-01-12 10:00:00', '2025-01-12 10:00:00');

    INSERT INTO tf_query_messages (id, query_id, message, author_role, created_at)
    VALUES (1, 1, 'Please fill in field X', 'DATA_MANAGER', '2025-01-10 10:00:00');

    INSERT INTO tf_query_messages (id, query_id, message, author_role, created_at)
    VALUES (2, 1, 'Done, updated now', 'SITE_COORDINATOR', '2025-01-10 11:00:00');

    INSERT INTO tf_query_messages (id, query_id, message, author_role, created_at)
    VALUES (3, 1, 'Thank you', 'DATA_MANAGER', '2025-01-10 12:00:00');
  `);
});

const FORM_INSTANCE_QUERIES = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on FormInstance {
        id
        queries {
          rows { id formInstanceId title status createdAt updatedAt }
          total
        }
      }
    }
  }
`;

const QUERY_MESSAGES = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on TfQuery {
        id
        messages {
          rows { id queryId message authorRole createdAt }
          total
        }
      }
    }
  }
`;

describe('query-management federation schema', () => {
  it('rejects unauthenticated access for FormInstance.queries', async () => {
    const result = await server.executeOperation(
      {
        query: FORM_INSTANCE_QUERIES,
        variables: {
          representations: [{ __typename: 'FormInstance', id: '1' }],
        },
      },
      { contextValue: { user: null } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects unauthenticated access for TfQuery.messages', async () => {
    const result = await server.executeOperation(
      {
        query: QUERY_MESSAGES,
        variables: {
          representations: [{ __typename: 'TfQuery', id: '1' }],
        },
      },
      { contextValue: { user: null } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('returns queries for a formInstanceId with pagination', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on FormInstance {
                queries(page: 1, pageSize: 2) {
                  rows { id title status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'FormInstance', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const fi = body.data._entities[0];
    expect(fi.queries.total).toBe(3);
    expect(fi.queries.rows).toHaveLength(2);
  });

  it('status filter works for FormInstance.queries', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on FormInstance {
                queries(status: "OPEN") {
                  rows { id status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'FormInstance', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const fi = body.data._entities[0];
    expect(fi.queries.total).toBe(2);
    expect(fi.queries.rows.every((r: any) => r.status === 'OPEN')).toBe(true);
  });

  it('non-existent formInstance returns empty page', async () => {
    const result = await server.executeOperation(
      {
        query: FORM_INSTANCE_QUERIES,
        variables: {
          representations: [{ __typename: 'FormInstance', id: '9999' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const fi = body.data._entities[0];
    expect(fi.queries.total).toBe(0);
    expect(fi.queries.rows).toHaveLength(0);
  });

  it('TfQuery.messages returns paginated messages', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on TfQuery {
                id
                messages(page: 1, pageSize: 2) {
                  rows { id message authorRole }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'TfQuery', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const q = body.data._entities[0];
    expect(q.messages.total).toBe(3);
    expect(q.messages.rows).toHaveLength(2);
    expect(q.messages.rows[0].authorRole).toBe('DATA_MANAGER');
  });
});
