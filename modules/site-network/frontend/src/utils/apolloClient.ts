import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  Observable,
  FetchResult,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { enqueueSnackbar } from 'notistack';
import { REFRESH_SESSION_MUTATION } from '../services/authService';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL,
  credentials: 'include',
});

// ── Toast deduplication ───────────────────────────────────────────────────────
let lastToastKey = '';
let lastToastTime = 0;

function showToastOnce(message: string, variant: 'error' | 'warning', key: string) {
  const now = Date.now();
  if (key === lastToastKey && now - lastToastTime < 3000) return;
  lastToastKey = key;
  lastToastTime = now;
  enqueueSnackbar(message, { variant });
}

// ── Refresh-token state ───────────────────────────────────────────────────────
// Single in-flight refresh promise — concurrent requests all wait on the same one.
let refreshPromise: Promise<boolean> | null = null;

function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = apolloClient
    .mutate({ mutation: REFRESH_SESSION_MUTATION })
    .then(({ data }) => !!(data?.refreshSession))
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function redirectToLogin() {
  apolloClient.clearStore().finally(() => {
    window.location.href = '/login';
  });
}

// ── Error link ────────────────────────────────────────────────────────────────
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  // ── Network-level errors ──────────────────────────────────────────────
  if (networkError) {
    const status = 'statusCode' in networkError ? (networkError as { statusCode: number }).statusCode : 0;
    const onLoginPage = window.location.pathname === '/login';

    if (status === 429) {
      if (!onLoginPage) showToastOnce('Too many requests. Please wait a moment.', 'warning', 'RATE_LIMITED');
      return;
    }
    if (status === 503 || status === 502 || status === 504) {
      showToastOnce('Server temporarily unavailable. Please try again shortly.', 'error', 'SERVER_UNAVAILABLE');
      return;
    }
    if (!status) {
      showToastOnce('Network error — check your connection and try again.', 'error', 'NETWORK_ERROR');
      return;
    }
  }

  if (!graphQLErrors?.length) return;

  for (const err of graphQLErrors) {
    const code = err.extensions?.code as string | undefined;

    if (code === 'RATE_LIMITED') {
      if (window.location.pathname !== '/login') {
        showToastOnce('Too many requests. Please wait a moment.', 'warning', 'RATE_LIMITED');
      }
      return;
    }

    if (code === 'UNAUTHENTICATED') {
      const onLoginPage = window.location.pathname === '/login';
      if (onLoginPage) return;

      // Never try to refresh the refreshSession mutation itself — that would loop.
      const isRefreshOp = operation.operationName === 'RefreshSession';
      if (isRefreshOp) {
        redirectToLogin();
        return;
      }

      // Attempt refresh-and-retry as an Observable so Apollo can forward the result.
      return new Observable<FetchResult>((observer) => {
        doRefresh().then((success) => {
          if (!success) {
            redirectToLogin();
            observer.error(err);
            return;
          }
          // Retry the original operation with the new access cookie now set.
          const sub = forward(operation).subscribe(observer);
          return () => sub.unsubscribe();
        });
      });
    }

    if (code === 'FORBIDDEN') {
      showToastOnce("You don't have permission to perform this action.", 'error', 'FORBIDDEN');
      return;
    }

    if (code === 'INTERNAL_SERVER_ERROR') {
      console.error('[GraphQL INTERNAL_SERVER_ERROR]', err);
      showToastOnce('Something went wrong. Please try again.', 'error', 'INTERNAL_SERVER_ERROR');
      return;
    }

    // BAD_USER_INPUT handled per-mutation in components — no global toast.
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
