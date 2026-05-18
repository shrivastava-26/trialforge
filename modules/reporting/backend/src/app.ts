import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { GraphQLContext, JwtPayload } from './types';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-1234';
const SHELL_ORIGIN = process.env.SHELL_ORIGIN ?? 'http://localhost:5173';

function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    const id = String(payload.userId ?? payload.id ?? '');
    const roles: string[] =
      Array.isArray(payload.roles)
        ? payload.roles
        : payload.role
          ? [payload.role as string]
          : [];
    return {
      id,
      email: payload.email as string,
      role: (payload.role as string) ?? roles[0],
      roles,
    };
  } catch {
    return null;
  }
}

export async function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: SHELL_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'reporting' });
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
