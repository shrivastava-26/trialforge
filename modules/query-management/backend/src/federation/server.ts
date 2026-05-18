/**
 * Federation-compatible server for query-management subgraph.
 * Runs on PORT_FEDERATION (default 4161).
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
import type { JwtPayload } from '@trialforge/shared-auth';

const JWT_SECRET = process.env.JWT_SECRET ?? 'trialforge-dev-secret';

function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { id: String(decoded.userId ?? decoded.id), email: decoded.email, roles: decoded.roles };
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
    res.json({ status: 'ok', module: 'query-management-subgraph' });
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
            service: 'query-management',
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
        const user = token ? verifyToken(token) : null;
        const requestId = (req.headers['x-request-id'] as string) ?? '';
        return { user, req, res, requestId };
      },
    }),
  );

  const port = Number(process.env.PORT_FEDERATION ?? 4161);
  app.listen(port, () => {
    console.log(`[query-management] Federation subgraph at http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('[query-management] Federation server failed to start', err);
  process.exit(1);
});
