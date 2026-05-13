import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { initConnection } from './db/connection';
import { initDb } from './db/migrate';
import { createApp } from './app';

const PORT = process.env.PORT ?? 4090;
const DB_PATH = path.join(__dirname, '..', 'data', 'edc.db');

async function main() {
  initConnection(DB_PATH);
  initDb();

  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`EDC backend running on http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error('Failed to start edc backend:', err);
  process.exit(1);
});
