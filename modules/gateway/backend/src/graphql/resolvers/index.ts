import { forwardOperation } from '../../services/proxy';
import type { GatewayContext } from '../../types';

const siteNetworkUrl = (): string =>
  process.env.SITE_NETWORK_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

const reportingUrl = (): string =>
  process.env.REPORTING_GRAPHQL_URL ?? 'http://localhost:4120/graphql';

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GatewayContext) => {
      const data = await forwardOperation({
        url: siteNetworkUrl(),
        query: `query { me { id email role } }`,
        req: ctx.req,
        res: ctx.res,
      });
      return data.me;
    },

    getDashboardMetrics: async (
      _: unknown,
      args: { studyId?: string; siteId?: string },
      ctx: GatewayContext,
    ) => {
      const data = await forwardOperation({
        url: reportingUrl(),
        query: `query($studyId: ID, $siteId: ID) {
          getDashboardMetrics(studyId: $studyId, siteId: $siteId) {
            patientsTotal patientsEnrolled patientsArchived
            visitsPlanned visitsCompleted visitsMissed
            formsActive formInstancesDraft formInstancesSubmitted
            queriesOpen queriesAnswered queriesClosed
            documentsTotal documentsArchived documentVersionsTotal
          }
        }`,
        variables: args,
        req: ctx.req,
        res: ctx.res,
      });
      return data.getDashboardMetrics;
    },
  },

  Mutation: {
    login: async (_: unknown, args: { email: string; password: string }, ctx: GatewayContext) => {
      const data = await forwardOperation({
        url: siteNetworkUrl(),
        query: `mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) { user { id email role } }
        }`,
        variables: args,
        req: ctx.req,
        res: ctx.res,
      });
      return data.login;
    },

    logout: async (_: unknown, __: unknown, ctx: GatewayContext) => {
      const data = await forwardOperation({
        url: siteNetworkUrl(),
        query: `mutation { logout }`,
        req: ctx.req,
        res: ctx.res,
      });
      return data.logout;
    },

    refreshSession: async (_: unknown, __: unknown, ctx: GatewayContext) => {
      const data = await forwardOperation({
        url: siteNetworkUrl(),
        query: `mutation { refreshSession }`,
        req: ctx.req,
        res: ctx.res,
      });
      return data.refreshSession;
    },
  },
};
