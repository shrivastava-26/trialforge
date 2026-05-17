import type { Request, Response } from 'express';
import { GraphQLError } from 'graphql';

const isDev = process.env.NODE_ENV !== 'production';

interface ForwardOptions {
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  req: Request;
  res: Response;
}

interface DownstreamResult {
  data?: Record<string, unknown>;
  errors?: Array<{
    message: string;
    extensions?: { code?: string; [key: string]: unknown };
    path?: string[];
  }>;
}

const KNOWN_CODES = new Set([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'INTERNAL_SERVER_ERROR',
]);

/**
 * Forwards a GraphQL operation to a downstream service,
 * propagating cookies in both directions.
 */
export async function forwardOperation(opts: ForwardOptions): Promise<Record<string, unknown>> {
  const { url, query, variables, req, res } = opts;

  if (isDev) {
    console.log(`[gateway] forwarding to ${url}`);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new GraphQLError('Downstream service unavailable', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  // Forward Set-Cookie headers from downstream to browser
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    res.append('Set-Cookie', cookie);
  }

  const body = (await response.json()) as DownstreamResult;

  // If downstream returned GraphQL errors, throw the first one preserving its code
  if (body.errors?.length) {
    const first = body.errors[0];
    const code = first.extensions?.code;
    throw new GraphQLError(first.message, {
      extensions: {
        code: code && KNOWN_CODES.has(code) ? code : 'INTERNAL_SERVER_ERROR',
      },
    });
  }

  return body.data ?? {};
}
