import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardOperation } from '../services/proxy';
import type { Request, Response } from 'express';

function mockReq(cookie?: string): Request {
  return { headers: { cookie } } as unknown as Request;
}

function mockRes(): Response {
  return { append: vi.fn() } as unknown as Response;
}

function mockFetchResponse(body: object, setCookies: string[] = []) {
  return {
    json: async () => body,
    headers: { getSetCookie: () => setCookies },
  } as unknown as globalThis.Response;
}

describe('Module Forwarding', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('forwards to patient-registry module', async () => {
    const patients = [{ id: '1', studyId: 's1', siteId: 'st1', subjectNumber: 'P001', status: 'ENROLLED', enrolledAt: null }];
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ data: { patients } }));

    const result = await forwardOperation({
      url: 'http://localhost:4010/graphql',
      query: 'query { patients(studyId: "s1") { id } }',
      req: mockReq('auth=tok'),
      res: mockRes(),
    });

    expect(result).toEqual({ patients });
    expect(fetch).toHaveBeenCalledWith('http://localhost:4010/graphql', expect.anything());
  });

  it('forwards to form-builder module', async () => {
    const forms = [{ id: 'f1', title: 'Vitals', version: 1, status: 'DRAFT', fields: '[]' }];
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ data: { forms } }));

    const result = await forwardOperation({
      url: 'http://localhost:4020/graphql',
      query: 'query { forms { id title } }',
      req: mockReq('auth=tok'),
      res: mockRes(),
    });

    expect(result).toEqual({ forms });
  });

  it('forwards to query-management module', async () => {
    const dataQueries = [{ id: 'q1', formInstanceId: 'fi1', fieldName: 'bp', status: 'OPEN', message: 'Check value', createdAt: '2024-01-01' }];
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ data: { dataQueries } }));

    const result = await forwardOperation({
      url: 'http://localhost:4030/graphql',
      query: 'query { dataQueries { id } }',
      req: mockReq('auth=tok'),
      res: mockRes(),
    });

    expect(result).toEqual({ dataQueries });
  });

  it('forwards to document-management module', async () => {
    const documents = [{ id: 'd1', title: 'Protocol', category: 'REGULATORY', status: 'ACTIVE', uploadedAt: '2024-01-01' }];
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ data: { documents } }));

    const result = await forwardOperation({
      url: 'http://localhost:4040/graphql',
      query: 'query { documents { id } }',
      req: mockReq('auth=tok'),
      res: mockRes(),
    });

    expect(result).toEqual({ documents });
  });
});

describe('Error Normalization', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('normalizes unknown error codes to INTERNAL_SERVER_ERROR', async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
      errors: [{ message: 'Something weird', extensions: { code: 'UNKNOWN_CODE' } }],
    }));

    await expect(forwardOperation({
      url: 'http://localhost:4010/graphql',
      query: '{ patients { id } }',
      req: mockReq(),
      res: mockRes(),
    })).rejects.toMatchObject({
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('preserves known error codes (FORBIDDEN)', async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
      errors: [{ message: 'No access', extensions: { code: 'FORBIDDEN' } }],
    }));

    await expect(forwardOperation({
      url: 'http://localhost:4010/graphql',
      query: '{ patients { id } }',
      req: mockReq(),
      res: mockRes(),
    })).rejects.toMatchObject({
      message: 'No access',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('preserves BAD_USER_INPUT code', async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
      errors: [{ message: 'Invalid input', extensions: { code: 'BAD_USER_INPUT' } }],
    }));

    await expect(forwardOperation({
      url: 'http://localhost:4020/graphql',
      query: 'mutation { createForm(input: {}) { id } }',
      req: mockReq(),
      res: mockRes(),
    })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('handles network failure as INTERNAL_SERVER_ERROR', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(forwardOperation({
      url: 'http://localhost:4040/graphql',
      query: '{ documents { id } }',
      req: mockReq(),
      res: mockRes(),
    })).rejects.toMatchObject({
      message: 'Downstream service unavailable',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
