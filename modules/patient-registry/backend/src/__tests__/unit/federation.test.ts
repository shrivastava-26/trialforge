import { describe, it, expect, beforeAll } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { setupTestDb, mockUser } from '../testHelpers';

let server: ApolloServer;

beforeAll(async () => {
  setupTestDb();
  const { schema } = await import('../../federation/schema');
  server = new ApolloServer({ schema });
  await server.start();
});

describe('patient-registry federation schema', () => {
  it('builds and exposes _service SDL with @key directives', async () => {
    const result = await server.executeOperation({
      query: '{ _service { sdl } }',
    });

    expect(result.body.kind).toBe('single');
    const data = (result.body as any).singleResult.data;
    const sdl = data._service.sdl as string;
    expect(sdl).toContain('@key');
    expect(sdl).toContain('type Patient');
    expect(sdl).toContain('type StudySubject');
    expect(sdl).toContain('type Study');
    expect(sdl).toContain('@external');
  });

  it('resolves _patientRegistryHealth query', async () => {
    const result = await server.executeOperation({
      query: '{ _patientRegistryHealth }',
    });

    expect(result.body.kind).toBe('single');
    const data = (result.body as any).singleResult.data;
    expect(data._patientRegistryHealth).toBe('ok');
  });

  it('resolves Study entity reference with subjects field', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query {
            _entities(representations: [{ __typename: "Study", id: "study-1" }]) {
              ... on Study {
                id
                subjects {
                  rows { id studyId }
                  total
                }
              }
            }
          }
        `,
      },
      { contextValue: { user: mockUser() } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const study = body.data._entities[0];
    expect(study.id).toBe('study-1');
    expect(study.subjects).toHaveProperty('rows');
    expect(study.subjects).toHaveProperty('total');
  });

  it('rejects unauthenticated access to Study.subjects', async () => {
    const result = await server.executeOperation(
      {
        query: `
          query {
            _entities(representations: [{ __typename: "Study", id: "study-1" }]) {
              ... on Study {
                subjects { total }
              }
            }
          }
        `,
      },
      { contextValue: { user: null } as any },
    );

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeDefined();
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('resolves Patient entity reference', async () => {
    const { createPatient } = await import('../../services/patientService');
    const patient = createPatient('FED-TEST-001');

    const result = await server.executeOperation({
      query: `
        query {
          _entities(representations: [{ __typename: "Patient", id: "${patient.id}" }]) {
            ... on Patient {
              id
              subjectId
              status
            }
          }
        }
      `,
    });

    expect(result.body.kind).toBe('single');
    const body = (result.body as any).singleResult;
    expect(body.errors).toBeUndefined();
    const resolved = body.data._entities[0];
    expect(resolved.subjectId).toBe('FED-TEST-001');
  });
});
