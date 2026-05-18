import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { getModuleUrl } from './services/moduleProxyService';
import type { GatewayContext, Role } from './types';

const isProd = process.env.NODE_ENV === 'production';

const KNOWN_CODES = new Set([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'INTERNAL_SERVER_ERROR',
]);

export async function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'gateway' });
  });

  const server = new ApolloServer<GatewayContext>({
    typeDefs,
    resolvers,
    introspection: !isProd,
    formatError: (formattedError) => {
      const { stacktrace: _s, ...safeExtensions } =
        (formattedError.extensions ?? {}) as Record<string, unknown> & { stacktrace?: unknown };
      const code = safeExtensions.code as string | undefined;
      return {
        ...formattedError,
        extensions: {
          ...safeExtensions,
          code: code && KNOWN_CODES.has(code) ? code : 'INTERNAL_SERVER_ERROR',
        },
      };
    },
  });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GatewayContext> => {
        const requestId = (req.headers['x-request-id'] as string) || randomUUID();
        const ctx: GatewayContext = { req, res, requestId };

        // Attempt to resolve user from session cookie (non-blocking for login/logout)
        if (req.headers.cookie) {
          try {
            const response = await fetch(getModuleUrl('siteNetwork'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                cookie: req.headers.cookie,
              },
              body: JSON.stringify({ query: '{ me { id email role } }' }),
            });
            const body = await response.json() as { data?: { me?: { id: string; email: string; role: string } } };
            if (body.data?.me) {
              ctx.user = { id: body.data.me.id, email: body.data.me.email, role: body.data.me.role as Role };
            }
          } catch {
            // Session resolution failed — proceed unauthenticated
          }
        }

        return ctx;
      },
    }),
  );

  return app;
}
