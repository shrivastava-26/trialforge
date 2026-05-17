/**
 * Federation-compatible server for site-network subgraph.
 * Runs on PORT_FEDERATION (default 4001) alongside the existing server on 4000.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { schema } from './schema';
import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { verifyToken } from '../utils/jwt';
import { createLoaders } from '../graphql/loaders';
import type { GraphQLContext } from '../types';

async function start() {
  initConnection(process.env.DB_PATH ?? './data/app.db');
  initDb();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'site-network-subgraph' });
  });

  const server = new ApolloServer<GraphQLContext>({ schema });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.cookies?.auth_token ?? null;
        const user = token ? verifyToken(token) : null;
        return { user, req, res, requestId: req.headers['x-request-id'] as string ?? '', loaders: createLoaders() };
      },
    }),
  );

  const port = Number(process.env.PORT_FEDERATION ?? 4001);
  app.listen(port, () => {
    console.log(`[site-network] Federation subgraph at http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('[site-network] Federation server failed to start', err);
  process.exit(1);
});
