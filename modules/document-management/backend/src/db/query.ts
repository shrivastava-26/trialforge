import { getDb } from './connection';

export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function execute(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
  const result = getDb().prepare(sql).run(...params);
  return { lastInsertRowid: result.lastInsertRowid as number, changes: result.changes };
}
