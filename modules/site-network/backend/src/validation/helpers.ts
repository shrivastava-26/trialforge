import { ZodError } from 'zod';
import { GraphQLError } from 'graphql';

export type FieldErrors = Record<string, string>;

// Converts a ZodError into a flat { fieldName: firstMessage } map
export function zodErrorToFieldErrors(err: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Throws a standardised BAD_USER_INPUT GraphQLError with fieldErrors
export function throwBadUserInput(fieldErrors: FieldErrors, message = 'Validation error'): never {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', fieldErrors },
  });
}

// Parse with Zod; throw BAD_USER_INPUT on failure
export function parseOrThrow<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ZodError } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throwBadUserInput(zodErrorToFieldErrors(result.error));
  }
  return result.data;
}
