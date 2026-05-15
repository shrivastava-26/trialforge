import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  Observable,
  gql,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { authClient } from './authClient';

export let enqueueError: (msg: string) => void = () => {};
export function setEnqueueError(fn: (msg: string) => void) {
  enqueueError = fn;
}

// Shared with authClient to prevent concurrent refresh attempts
let isRefreshing = false;
let pendingRetries: Array<() => void> = [];

const REFRESH_SESSION = gql`
  mutation RefreshSession {
    refreshSession
  }
`;

function resolvePending() {
  pendingRetries.forEach((cb) => cb());
  pendingRetries = [];
}

function failPending() {
  pendingRetries = [];
}

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_REPORTING_GRAPHQL_URL,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const isUnauthenticated = graphQLErrors?.some(
    (e) => e.extensions?.code === 'UNAUTHENTICATED',
  );

  if (!isUnauthenticated) {
    const msg =
      graphQLErrors?.[0]?.message ?? networkError?.message ?? 'Request failed';
    enqueueError(msg);
    return;
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[reportingClient] UNAUTHENTICATED on operation: ${operation.operationName ?? 'unknown'}`,
    );
  }

  // If already refreshing, queue this retry
  if (isRefreshing) {
    return new Observable((observer) => {
      pendingRetries.push(() => {
        forward(operation).subscribe(observer);
      });
    });
  }

  isRefreshing = true;

  return new Observable((observer) => {
    authClient
      .mutate({ mutation: REFRESH_SESSION })
      .then(({ data }) => {
        if (!data?.refreshSession) {
          throw new Error('Refresh failed');
        }
        resolvePending();
        // Retry the original reporting operation once
        forward(operation).subscribe(observer);
      })
      .catch(() => {
        failPending();
        observer.complete();
        if (import.meta.env.DEV) {
          console.warn('[reportingClient] Refresh failed, redirecting to /login');
        }
        window.location.href = '/login';
      })
      .finally(() => {
        isRefreshing = false;
      });
  });
});

export const reportingClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'no-cache' },
    query: { fetchPolicy: 'no-cache' },
  },
});
