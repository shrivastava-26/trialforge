/**
 * Apollo Federation Gateway — composes subgraphs.
 * Runs on PORT_FEDERATION (default 4250) in parallel with the existing proxy gateway (4200).
 *
 * Usage:
 *   npm run dev:federation
 *
 * Requires subgraphs running:
 *   - site-network on http://localhost:4001/graphql
 *   - reporting on http://localhost:4121/graphql
 *   - patient-registry on http://localhost:4131/graphql
 *   - visit-scheduling on http://localhost:4141/graphql
 *   - edc on http://localhost:4151/graphql
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  override willSendRequest({ request, context }: any) {
    if (context.req?.headers?.cookie) {
      request.http.headers.set('cookie', context.req.headers.cookie);
    }
  }

  override async didReceiveResponse(requestContext: any) {
    const { response, context } = requestContext;
    const setCookies = response.http?.headers?.raw?.()?.['set-cookie']
      ?? response.http?.headers?.getSetCookie?.()
      ?? [];
    if (context.res) {
      for (const cookie of setCookies) {
        context.res.append('Set-Cookie', cookie);
      }
    }
    return response;
  }
}

const SUBGRAPHS = [
  { name: 'site-network', url: process.env.SUBGRAPH_SITE_NETWORK_URL ?? 'http://localhost:4001/graphql' },
  { name: 'reporting', url: process.env.SUBGRAPH_REPORTING_URL ?? 'http://localhost:4121/graphql' },
  { name: 'patient-registry', url: process.env.SUBGRAPH_PATIENT_REGISTRY_URL ?? 'http://localhost:4131/graphql' },
  { name: 'visit-scheduling', url: process.env.SUBGRAPH_VISIT_SCHEDULING_URL ?? 'http://localhost:4141/graphql' },
  { name: 'edc', url: process.env.SUBGRAPH_EDC_URL ?? 'http://localhost:4151/graphql' },
  { name: 'query-management', url: process.env.SUBGRAPH_QUERY_MANAGEMENT_URL ?? 'http://localhost:4161/graphql' },
];

async function waitForSubgraphs(maxRetries = 30, delayMs = 2000): Promise<void> {
  for (const subgraph of SUBGRAPHS) {
    let ready = false;
    for (let i = 0; i < maxRetries && !ready; i++) {
      try {
        const res = await fetch(subgraph.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ __typename }' }),
        });
        if (res.ok) ready = true;
      } catch {
        // not ready yet
      }
      if (!ready) {
        console.log(`[federation-gateway] Waiting for ${subgraph.name} at ${subgraph.url}... (${i + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    if (!ready) {
      throw new Error(`Subgraph "${subgraph.name}" at ${subgraph.url} not reachable after ${maxRetries} retries`);
    }
    console.log(`[federation-gateway] ✓ ${subgraph.name} is ready`);
  }
}

async function start() {
  console.log('[federation-gateway] Waiting for subgraphs to be available...');
  await waitForSubgraphs();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({ subgraphs: SUBGRAPHS }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
  });

  const server = new ApolloServer({ gateway, introspection: true });
  await server.start();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'federation-gateway' });
  });

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ req, res }),
    }),
  );

  const port = Number(process.env.PORT_FEDERATION ?? 4250);
  app.listen(port, () => {
    console.log(`[federation-gateway] Running at http://localhost:${port}/graphql`);
    console.log(`  Composing subgraphs: site-network, reporting, patient-registry, visit-scheduling, edc, query-management`);
  });
}

start().catch((err) => {
  console.error('[federation-gateway] Failed to start', err);
  process.exit(1);
});
