import type { ApolloError } from '@apollo/client';

export type FieldErrors = Record<string, string>;

export interface ParsedGqlError {
  code: string;
  message: string;
  fieldErrors: FieldErrors;
}

// Extract the first GraphQL error's code, message, and fieldErrors
export function parseGqlError(err: unknown): ParsedGqlError {
  const apolloErr = err as ApolloError | undefined;
  const gqlErr = apolloErr?.graphQLErrors?.[0];
  const code = (gqlErr?.extensions?.code as string) ?? 'UNKNOWN';
  const message = gqlErr?.message ?? (err instanceof Error ? err.message : 'An error occurred');
  const fieldErrors = (gqlErr?.extensions?.fieldErrors as FieldErrors) ?? {};
  return { code, message, fieldErrors };
}
