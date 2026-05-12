import { z } from 'zod';

export const envSchema = z.object({
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.string().regex(/^\d+$/).optional(),
  DB_PATH: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  // CORS_ORIGIN: set to your frontend URL in production (e.g. https://your-app.com)
  CORS_ORIGIN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;
