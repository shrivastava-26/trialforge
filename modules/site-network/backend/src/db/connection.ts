import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../logger/logger';

let db: Database.Database;

export function getDb(): Database.Database {
  return db;
}

export function initConnection(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  logger.info(`Database connected at ${dbPath}`);
}
