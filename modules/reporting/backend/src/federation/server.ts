/**
 * Federation-compatible server for reporting subgraph.
 * Runs on PORT_FEDERATION (default 4121) alongside the existing server on 4120.
 */
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { schema } from './schema';
import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import jwt from 'jsonwebtoken';
import type { GraphQLContext, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-1234';

function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    const roles: JwtPayload['roles'] =
      Array.isArray(payload.roles)
        ? payload.roles
        : payload.role
          ? [payload.role as JwtPayload['roles'][number]]
          : [];
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: (payload.role as JwtPayload['role']) ?? roles[0],
      roles,
    };
  } catch {
    return null;
  }
}

async function start() {
  const DB_PATH = path.join(__dirname, '..', '..', 'data', 'reporting.db');
  initConnection(DB_PATH);
  initDb();

  const app = express();
  app.use(cors({ origin: process.env.SHELL_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'reporting-subgraph' });
  });

  const server = new ApolloServer<GraphQLContext>({ schema });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.cookies?.auth_token as string | undefined;
        const user = token ? verifyToken(token) : null;
        return { user, req, res };
      },
    }),
  );

  const port = Number(process.env.PORT_FEDERATION ?? 4121);
  app.listen(port, () => {
    console.log(`[reporting] Federation subgraph at http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('[reporting] Federation server failed to start', err);
  process.exit(1);
});
