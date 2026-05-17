import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import type { GatewayContext } from './types';

const isProd = process.env.NODE_ENV === 'production';

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
      return { ...formattedError, extensions: safeExtensions };
    },
  });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ req, res }),
    }),
  );

  return app;
}
