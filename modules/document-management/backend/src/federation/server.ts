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
import type { ApolloServerPlugin } from '@apollo/server';
import jwt from 'jsonwebtoken';
import { schema } from './schema';
import { initConnection } from '../db/connection';
import { initDb } from '../db/migrate';
import { GraphQLContext } from '../types';

interface TokenPayload {
  userId?: number;
  id?: string;
  email: string;
  roles?: string[];
  role?: string;
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'trialforge-dev-secret';

function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
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

  const loggingPlugin: ApolloServerPlugin<GraphQLContext> = {
    async requestDidStart({ request, contextValue }) {
      const start = Date.now();
      return {
        async didEncounterErrors({ errors }) {
          for (const err of errors) {
            if (!err.extensions) (err as any).extensions = {};
            (err.extensions as any).requestId = contextValue.requestId;
          }
        },
        async willSendResponse() {
          console.log(JSON.stringify({
            service: 'document-management',
            requestId: contextValue.requestId,
            operationName: request.operationName ?? 'anonymous',
            durationMs: Date.now() - start,
          }));
        },
      };
    },
  };

  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [loggingPlugin],
  });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.cookies?.auth_token as string | undefined;
        const payload = token ? verifyToken(token) : null;
        const user = payload
          ? {
              id: payload.id ?? String(payload.userId ?? ''),
              userId: payload.userId,
              email: payload.email,
              roles: payload.roles ?? (payload.role ? [payload.role] : []),
              role: payload.role,
            }
          : null;
        const requestId = (req.headers['x-request-id'] as string) ?? '';
        return { user, req, res, requestId };
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
