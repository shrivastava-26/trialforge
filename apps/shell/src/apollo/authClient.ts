import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  Observable,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { gql } from '@apollo/client';

const REFRESH_SESSION = gql`
  mutation RefreshSession {
    refreshSession
  }
`;

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePending() {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
}

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_AUTH_GRAPHQL_URL,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  const isUnauthenticated = graphQLErrors?.some(
    (e) => e.extensions?.code === 'UNAUTHENTICATED',
  );
  if (!isUnauthenticated) return;

  // Prevent infinite loop on refreshSession itself
  if (operation.operationName === 'RefreshSession') return;

  if (import.meta.env.DEV) {
    console.warn(
      `[authClient] UNAUTHENTICATED on operation: ${operation.operationName ?? 'unknown'}, attempting refresh`,
    );
  }

  if (isRefreshing) {
    return new Observable((observer) => {
      pendingRequests.push(() => {
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
        forward(operation).subscribe(observer);
      })
      .catch(() => {
        pendingRequests = [];
        observer.error(new Error('Session expired'));
      })
      .finally(() => {
        isRefreshing = false;
      });
  });
});

export const authClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
