/**
 * Federation-compatible server for document-management subgraph.
 * Runs on PORT_FEDERATION (default 4181).
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { schema } from './schema';
import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { GraphQLContext, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'trialforge-dev-secret';

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

async function start() {
  const dbPath = process.env.DB_PATH ?? path.join(__dirname, '..', '..', 'data', 'app.db');
  initConnection(dbPath);
  initDb();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'document-management-subgraph' });
  });

  const server = new ApolloServer<GraphQLContext>({ schema });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.cookies?.auth_token as string | undefined;
        const payload = token ? verifyToken(token) : null;
        const user = payload
          ? { ...payload, roles: payload.roles ?? (payload.role ? [payload.role] : []) }
          : null;
        return { user, req, res };
      },
    }),
  );

  const port = Number(process.env.PORT_FEDERATION ?? 4181);
  app.listen(port, () => {
    console.log(`[document-management] Federation subgraph at http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('[document-management] Federation server failed to start', err);
  process.exit(1);
});
