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
  db.exec('DELETE FROM tf_form_responses');
  db.exec('DELETE FROM tf_form_instances');
  db.exec('DELETE FROM tf_form_fields');
  db.exec('DELETE FROM tf_forms');
  db.exec('DELETE FROM tf_patient_visits');
  db.exec('DELETE FROM tf_study_subjects');

  db.exec(`
    INSERT INTO tf_study_subjects (id, study_id, site_id, patient_id, status)
    VALUES (1, 'STUDY-001', 'SITE-A', 1, 'ENROLLED');

    INSERT INTO tf_patient_visits (id, study_subject_id, visit_template_id, scheduled_date, status)
    VALUES (1, 1, 1, '2025-01-15', 'PLANNED');

    INSERT INTO tf_forms (id, study_id, name, version, status)
    VALUES (1, 1, 'Demographics', 1, 'ACTIVE');

    INSERT INTO tf_forms (id, study_id, name, version, status)
    VALUES (2, 1, 'Vital Signs', 1, 'ACTIVE');

    INSERT INTO tf_form_instances (id, patient_visit_id, form_id, status, created_at, updated_at)
    VALUES (1, 1, 1, 'DRAFT', '2025-01-15 10:00:00', '2025-01-15 10:00:00');

    INSERT INTO tf_form_instances (id, patient_visit_id, form_id, status, created_at, updated_at)
    VALUES (2, 1, 2, 'SUBMITTED', '2025-01-15 11:00:00', '2025-01-15 12:00:00');
  `);
});

const PATIENT_VISIT_FORM_INSTANCES_QUERY = `
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on PatientVisit {
        id
        formInstances {
          rows { id patientVisitId formId status createdAt updatedAt }
          total
        }
      }
    }
  }
`;

describe('edc federation schema', () => {
  it('rejects unauthenticated access', async () => {
    const result = await server.executeOperation(
      {
        query: PATIENT_VISIT_FORM_INSTANCES_QUERY,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '1' }],
        },
      },
      { contextValue: { user: null } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects forbidden role', async () => {
    const result = await server.executeOperation(
      {
        query: PATIENT_VISIT_FORM_INSTANCES_QUERY,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '1' }],
        },
      },
      { contextValue: { user: mockUser({ roles: ['MONITOR'] }) } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('returns form instances for a patientVisitId', async () => {
    const result = await server.executeOperation(
      {
        query: PATIENT_VISIT_FORM_INSTANCES_QUERY,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const visit = body.data._entities[0];
    expect(visit.formInstances.total).toBe(2);
    expect(visit.formInstances.rows).toHaveLength(2);
    expect(visit.formInstances.rows[0].patientVisitId).toBe('1');
  });

  it('pagination works', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on PatientVisit {
                formInstances(page: 1, pageSize: 1) {
                  rows { id }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const visit = body.data._entities[0];
    expect(visit.formInstances.total).toBe(2);
    expect(visit.formInstances.rows).toHaveLength(1);
  });

  it('status filter works', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on PatientVisit {
                formInstances(status: "SUBMITTED") {
                  rows { id status }
                  total
                }
              }
            }
          }
        `,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '1' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const visit = body.data._entities[0];
    expect(visit.formInstances.total).toBe(1);
    expect(visit.formInstances.rows[0].status).toBe('SUBMITTED');
  });

  it('non-existent patientVisit returns empty page', async () => {
    const result = await server.executeOperation(
      {
        query: PATIENT_VISIT_FORM_INSTANCES_QUERY,
        variables: {
          representations: [{ __typename: 'PatientVisit', id: '9999' }],
        },
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const visit = body.data._entities[0];
    expect(visit.formInstances.total).toBe(0);
    expect(visit.formInstances.rows).toHaveLength(0);
  });
});
