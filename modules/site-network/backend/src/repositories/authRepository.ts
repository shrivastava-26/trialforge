import { queryOne } from '../db/query';
import { UserRow } from '../types';

export function findUserByEmail(email: string): UserRow | null {
  return queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]) ?? null;
}

export function findUserById(id: number): Omit<UserRow, 'password'> | null {
  return queryOne<Omit<UserRow, 'password'>>('SELECT id, email, role FROM users WHERE id = ?', [id]) ?? null;
}
