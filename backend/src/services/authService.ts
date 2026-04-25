import { GraphQLError } from 'graphql';
import { queryOne } from '../db/query';
import { UserRow } from '../types';
import { verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

export function loginUser(email: string, password: string) {
  const user = queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]);

  if (!user || !verifyPassword(password, user.password)) {
    throw new GraphQLError('Invalid credentials', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export function getUserById(id: number) {
  return queryOne<UserRow>('SELECT id, email, role FROM users WHERE id = ?', [id]) ?? null;
}
