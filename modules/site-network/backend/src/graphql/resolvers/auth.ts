import { GraphQLContext } from '../../types';
import { loginUser, getUserById, refreshSession, revokeSession, REFRESH_TOKEN_TTL_MS } from '../../services/authService';
import { requireAuth } from './helpers';
import { parseOrThrow, loginSchema } from '../../validation';
import { ACCESS_TOKEN_TTL_MS } from '../../utils/jwt';

const ACCESS_COOKIE = 'auth_token';
const REFRESH_COOKIE = 'refresh_token';

const isProd = () => process.env.NODE_ENV === 'production';

function setAccessCookie(res: GraphQLContext['res'], token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
}

function setRefreshCookie(res: GraphQLContext['res'], token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearAuthCookies(res: GraphQLContext['res']): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

export const authResolvers = {
  Query: {
    me(_: unknown, __: unknown, context: GraphQLContext) {
      requireAuth(context);
      return getUserById(context.user!.userId);
    },
  },

  Mutation: {
    login(_: unknown, args: { email: string; password: string }, context: GraphQLContext) {
      const { email, password } = parseOrThrow(loginSchema, args);
      const result = loginUser(email, password);

      setAccessCookie(context.res, result.accessToken);
      setRefreshCookie(context.res, result.refreshToken);

      return { user: result.user };
    },

    logout(_: unknown, __: unknown, context: GraphQLContext) {
      requireAuth(context);
      const rawRefresh = context.req.cookies?.[REFRESH_COOKIE] ?? null;
      if (rawRefresh) revokeSession(rawRefresh);
      clearAuthCookies(context.res);
      return true;
    },

    refreshSession(_: unknown, __: unknown, context: GraphQLContext) {
      const rawRefresh = context.req.cookies?.[REFRESH_COOKIE] ?? null;
      if (!rawRefresh) {
        clearAuthCookies(context.res);
        return false;
      }

      const result = refreshSession(rawRefresh);
      if (!result) {
        clearAuthCookies(context.res);
        return false;
      }

      setAccessCookie(context.res, result.accessToken);
      setRefreshCookie(context.res, result.refreshToken);
      return true;
    },
  },
};
