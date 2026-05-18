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
  db.exec('DELETE FROM tf_document_versions');
  db.exec('DELETE FROM tf_documents');

  db.exec(`
    INSERT INTO tf_documents (id, study_id, title, category, status, created_at, updated_at)
    VALUES (1, 1, 'Protocol v1', 'Protocol', 'ACTIVE', '2025-01-01 10:00:00', '2025-01-02 10:00:00');

    INSERT INTO tf_documents (id, study_id, title, category, status, created_at, updated_at)
    VALUES (2, 1, 'ICF Draft', 'ICF', 'DRAFT', '2025-01-03 10:00:00', '2025-01-03 10:00:00');

    INSERT INTO tf_documents (id, study_id, title, category, status, created_at, updated_at)
    VALUES (3, 1, 'Archived Doc', 'TMF', 'ARCHIVED', '2025-01-04 10:00:00', '2025-01-04 10:00:00');

    INSERT INTO tf_document_versions (id, document_id, version_number, file_ref, status, created_at)
    VALUES (1, 1, 1, '/docs/protocol-v1.pdf', 'SUPERSEDED', '2025-01-01 10:00:00');

    INSERT INTO tf_document_versions (id, document_id, version_number, file_ref, status, created_at)
    VALUES (2, 1, 2, '/docs/protocol-v2.pdf', 'ACTIVE', '2025-01-02 10:00:00');

    INSERT INTO tf_document_versions (id, document_id, version_number, file_ref, status, created_at)
    VALUES (3, 2, 1, '/docs/icf-v1.pdf', 'ACTIVE', '2025-01-03 10:00:00');
  `);
});

const STUDY_DOCUMENTS = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Study {
        id
        documents {
          rows { id studyId title category status createdAt updatedAt }
          total
        }
      }
    }
  }
`;

const DOCUMENT_VERSIONS = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Document {
        id
        versions { id documentId versionNumber fileRef status uploadedAt }
      }
    }
  }
`;

describe('document-management federation schema', () => {
  it('rejects unauthenticated access for Study.documents', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_DOCUMENTS,
        variables: {
          representations: [{ __typename: 'Study', id: '1' }],
        },
      },
      { contextValue: { user: null } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('returns documents for a studyId with pagination', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on Study {
                documents(page: 1, pageSize: 2) {
                  rows { id title status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'Study', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const study = body.data._entities[0];
    expect(study.documents.total).toBe(3);
    expect(study.documents.rows).toHaveLength(2);
  });

  it('status filter works for Study.documents', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on Study {
                documents(status: "ACTIVE") {
                  rows { id status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'Study', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const study = body.data._entities[0];
    expect(study.documents.total).toBe(1);
    expect(study.documents.rows.every((r: any) => r.status === 'ACTIVE')).toBe(true);
  });

  it('Document.versions resolves correctly', async () => {
    const result = await server.executeOperation(
      {
        query: DOCUMENT_VERSIONS,
        variables: {
          representations: [{ __typename: 'Document', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const doc = body.data._entities[0];
    expect(doc.versions).toHaveLength(2);
    expect(doc.versions[0].versionNumber).toBe(2); // DESC order
    expect(doc.versions[1].versionNumber).toBe(1);
    expect(doc.versions[0].fileRef).toBe('/docs/protocol-v2.pdf');
    expect(doc.versions[0].uploadedAt).toBe('2025-01-02 10:00:00');
  });

  it('non-existent study returns empty page', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_DOCUMENTS,
        variables: {
          representations: [{ __typename: 'Study', id: '9999' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const study = body.data._entities[0];
    expect(study.documents.total).toBe(0);
    expect(study.documents.rows).toHaveLength(0);
  });

  it('works when JWT has only role (string) instead of roles array', async () => {
    const userWithSingleRole = { id: '2', userId: 2, email: 'mgr@trialforge.io', role: 'CRO_MANAGER' } as any;
    const result = await server.executeOperation(
      {
        query: STUDY_DOCUMENTS,
        variables: {
          representations: [{ __typename: 'Study', id: '1' }],
        },
      },
      { contextValue: { user: userWithSingleRole } as any },
    );

    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const study = body.data._entities[0];
    expect(study.documents.total).toBe(3);
  });
});
