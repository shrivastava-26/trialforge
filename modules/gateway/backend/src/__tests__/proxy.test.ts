import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardOperation } from '../services/proxy';
import type { Request, Response } from 'express';

function mockReq(cookie?: string): Request {
  return { headers: { cookie } } as unknown as Request;
}

function mockRes(): Response {
  const headers: string[] = [];
  return {
    append: vi.fn((name: string, value: string) => {
      if (name === 'Set-Cookie') headers.push(value);
    }),
    _cookies: headers,
  } as unknown as Response;
}

function mockFetchResponse(body: object, setCookies: string[] = []) {
  return {
    json: async () => body,
    headers: {
      getSetCookie: () => setCookies,
    },
  } as unknown as globalThis.Response;
}

describe('Gateway Proxy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards me query to site-network and returns user', async () => {
    const user = { id: '1', email: 'test@example.com', role: 'admin' };
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ data: { me: user } }),
    );

    const req = mockReq('auth_token=abc123');
    const res = mockRes();

    const result = await forwardOperation({
      url: 'http://localhost:4000/graphql',
      query: '{ me { id email role } }',
      req,
      res,
    });

    expect(result).toEqual({ me: user });
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/graphql', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ cookie: 'auth_token=abc123' }),
    }));
  });

  it('forwards login and propagates Set-Cookie headers', async () => {
    const loginData = { login: { user: { id: '1', email: 'a@b.com', role: 'admin' } } };
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ data: loginData }, [
        'auth_token=xyz; HttpOnly; Path=/',
        'refresh_token=rt; HttpOnly; Path=/',
      ]),
    );

    const req = mockReq();
    const res = mockRes();

    await forwardOperation({
      url: 'http://localhost:4000/graphql',
      query: 'mutation { login(email:"a@b.com", password:"p") { user { id email role } } }',
      req,
      res,
    });

    expect(res.append).toHaveBeenCalledWith('Set-Cookie', 'auth_token=xyz; HttpOnly; Path=/');
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', 'refresh_token=rt; HttpOnly; Path=/');
  });

  it('forwards getDashboardMetrics with Cookie header', async () => {
    const metrics = {
      patientsTotal: 10, patientsEnrolled: 5, patientsArchived: 1,
      visitsPlanned: 8, visitsCompleted: 3, visitsMissed: 0,
      formsActive: 2, formInstancesDraft: 1, formInstancesSubmitted: 4,
      queriesOpen: 3, queriesAnswered: 2, queriesClosed: 1,
      documentsTotal: 7, documentsArchived: 0, documentVersionsTotal: 12,
    };
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({ data: { getDashboardMetrics: metrics } }),
    );

    const req = mockReq('auth_token=tok123');
    const res = mockRes();

    const result = await forwardOperation({
      url: 'http://localhost:4120/graphql',
      query: 'query { getDashboardMetrics { patientsTotal } }',
      variables: { studyId: '1' },
      req,
      res,
    });

    expect(result).toEqual({ getDashboardMetrics: metrics });
    expect(fetch).toHaveBeenCalledWith('http://localhost:4120/graphql', expect.objectContaining({
      headers: expect.objectContaining({ cookie: 'auth_token=tok123' }),
    }));
  });

  it('handles downstream UNAUTHENTICATED error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        errors: [{ message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } }],
      }),
    );

    const req = mockReq();
    const res = mockRes();

    await expect(
      forwardOperation({
        url: 'http://localhost:4000/graphql',
        query: '{ me { id } }',
        req,
        res,
      }),
    ).rejects.toMatchObject({
      message: 'Not authenticated',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('handles downstream unavailable safely', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const req = mockReq();
    const res = mockRes();

    await expect(
      forwardOperation({
        url: 'http://localhost:4000/graphql',
        query: '{ me { id } }',
        req,
        res,
      }),
    ).rejects.toMatchObject({
      message: 'Downstream service unavailable',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
