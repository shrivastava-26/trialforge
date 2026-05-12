import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { verifyToken } from './utils/jwt';
import { getDb } from './db/connection';
import { GraphQLContext } from './types';
import logger from './logger/logger';
import requestLogger from './logger/requestLogger';
import { requestIdMiddleware } from './middleware/requestId';
import { helmetMiddleware, graphqlRateLimit, loginRateLimit } from './middleware/security';
import { createLoaders } from './graphql/loaders';

const isProd = process.env.NODE_ENV === 'production';

export async function createApp() {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────
  app.use(helmetMiddleware);

  // ── Request correlation ID ────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── HTTP request logging ──────────────────────────────────────────────
  app.use(requestLogger);

  // ── Standard middleware ───────────────────────────────────────────────
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // ── Health check ──────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    try {
      getDb().prepare('SELECT 1').get();
      res.json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', db: 'unreachable' });
    }
  });

  // ── Apollo Server ─────────────────────────────────────────────────────
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    // Disable introspection in production to reduce attack surface
    introspection: !isProd,
    formatError: (formattedError, error) => {
      // Log unexpected server errors with full detail server-side; strip stack from response
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        logger.error('GraphQL internal error', { error, requestId: (error as Record<string, unknown>)?.requestId });
      }
      // Never leak stack traces to clients
      const { stacktrace: _s, ...safeExtensions } = (formattedError.extensions ?? {}) as Record<string, unknown> & { stacktrace?: unknown };
      return { ...formattedError, extensions: safeExtensions };
    },
  });
  await server.start();

  // Login mutation rate-limit: applied before GraphQL processes the request.
  // We inspect the raw body for the operation name to target only login.
  app.use('/graphql', loginRateLimit);
  app.use('/graphql', graphqlRateLimit);

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const token = req.cookies?.auth_token ?? null;
        const user = token ? verifyToken(token) : null;
        return { user, req, res, requestId: req.requestId, loaders: createLoaders() };
      },
    })
  );

  return app;
}
