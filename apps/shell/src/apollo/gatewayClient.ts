import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  Observable,
  gql,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

export let enqueueError: (msg: string) => void = () => {};
export function setEnqueueError(fn: (msg: string) => void) {
  enqueueError = fn;
}

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
  uri: import.meta.env.VITE_GATEWAY_GRAPHQL_URL,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const isUnauthenticated = graphQLErrors?.some(
    (e) => e.extensions?.code === 'UNAUTHENTICATED',
  );

  if (!isUnauthenticated) {
    const msg =
      graphQLErrors?.[0]?.message ?? networkError?.message;
    if (msg) enqueueError(msg);
    return;
  }

  // Prevent infinite loop on refreshSession itself
  if (operation.operationName === 'RefreshSession') return;

  if (import.meta.env.DEV) {
    console.warn(
      `[gatewayClient] UNAUTHENTICATED on operation: ${operation.operationName ?? 'unknown'}, attempting refresh`,
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
    gatewayClient
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

export const gatewayClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'no-cache' },
    query: { fetchPolicy: 'no-cache' },
  },
});
