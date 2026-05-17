import 'dotenv/config';
import { createApp } from './app';
import { envSchema } from './validation/env';

function validateEnv(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
}

async function start() {
  validateEnv();

  const app = await createApp();
  const port = Number(process.env.PORT ?? 4200);

  app.listen(port, () => {
    console.log(`[gateway] GraphQL gateway running at http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('[gateway] Failed to start', err);
  process.exit(1);
});
