import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('4200'),
  SITE_NETWORK_GRAPHQL_URL: z.string().url(),
  REPORTING_GRAPHQL_URL: z.string().url(),
  PATIENT_REGISTRY_GRAPHQL_URL: z.string().url(),
  FORM_BUILDER_GRAPHQL_URL: z.string().url(),
  QUERY_MANAGEMENT_GRAPHQL_URL: z.string().url(),
  DOCUMENT_MANAGEMENT_GRAPHQL_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;
