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
  db.exec('DELETE FROM tf_patient_visits');
  db.exec('DELETE FROM tf_visit_templates');
  db.exec('DELETE FROM tf_study_subjects');

  db.exec(`
    INSERT INTO tf_study_subjects (id, study_id, site_id, patient_id, status)
    VALUES (1, 'STUDY-001', 'SITE-A', 1, 'ENROLLED');

    INSERT INTO tf_visit_templates (id, study_id, name, day_offset, window_min_days, window_max_days)
    VALUES (1, 1, 'Screening', 0, 0, 3);

    INSERT INTO tf_visit_templates (id, study_id, name, day_offset, window_min_days, window_max_days)
    VALUES (2, 1, 'Baseline', 7, 0, 2);

    INSERT INTO tf_patient_visits (id, study_subject_id, visit_template_id, scheduled_date, status)
    VALUES (1, 1, 1, '2025-01-15', 'PLANNED');

    INSERT INTO tf_patient_visits (id, study_subject_id, visit_template_id, scheduled_date, completed_date, status)
    VALUES (2, 1, 2, '2025-02-01', '2025-02-01', 'COMPLETED');
  `);
});

const STUDY_SUBJECT_VISITS_QUERY = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on StudySubject {
        id
        visits {
          rows { id studySubjectId status scheduledDate completedDate }
          total
        }
      }
    }
  }
`;

describe('visit-scheduling federation schema', () => {
  it('builds and exposes _service SDL with @key directives', async () => {
    const result = await server.executeOperation({
      query: '{ _service { sdl } }',
    });

    expect(result.body.kind).toBe('single');
    const data = (result.body as any).singleResult.data;
    const sdl = data._service.sdl as string;
    expect(sdl).toContain('@key');
    expect(sdl).toContain('type VisitTemplate');
    expect(sdl).toContain('type PatientVisit');
    expect(sdl).toContain('type StudySubject');
    expect(sdl).toContain('@external');
  });

  it('rejects unauthenticated access to StudySubject.visits', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_SUBJECT_VISITS_QUERY,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '1' }],
        },
      },
      { contextValue: { user: null } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects unauthorized role access to StudySubject.visits', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_SUBJECT_VISITS_QUERY,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '1' }],
        },
      },
      { contextValue: { user: mockUser({ roles: ['MONITOR'] }) } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('resolves StudySubject.visits with all visits', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_SUBJECT_VISITS_QUERY,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const subject = body.data._entities[0];
    expect(subject.visits.total).toBe(2);
    expect(subject.visits.rows).toHaveLength(2);
    expect(subject.visits.rows[0].studySubjectId).toBe('1');
  });

  it('supports pagination on StudySubject.visits', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on StudySubject {
                visits(page: 1, pageSize: 1) {
                  rows { id }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const subject = body.data._entities[0];
    expect(subject.visits.total).toBe(2);
    expect(subject.visits.rows).toHaveLength(1);
  });

  it('supports status filter on StudySubject.visits', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on StudySubject {
                visits(status: "COMPLETED") {
                  rows { id status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const subject = body.data._entities[0];
    expect(subject.visits.total).toBe(1);
    expect(subject.visits.rows[0].status).toBe('COMPLETED');
  });

  it('returns empty results for non-existent study subject', async () => {
    const result = await server.executeOperation(
      {
        query: STUDY_SUBJECT_VISITS_QUERY,
        variables: {
          representations: [{ __typename: 'StudySubject', id: '9999' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const subject = body.data._entities[0];
    expect(subject.visits.total).toBe(0);
    expect(subject.visits.rows).toHaveLength(0);
  });
});
