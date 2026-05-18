import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { GraphQLContext } from './types';
import type { JwtPayload } from '@trialforge/shared-auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'trialforge-dev-secret';

function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { id: String(decoded.userId ?? decoded.id), email: decoded.email, roles: decoded.roles };
  } catch {
    return null;
  }
}

export async function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'query-management' });
  });

  const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.cookies?.auth_token as string | undefined;
        const user = token ? verifyToken(token) : null;
        return { user, req, res };
      },
    })
  );

  return app;
}
