import { queryAll, queryOne, execute } from '../db/query';
import { TfRoleRow, RoleName } from '../types';

export function findRoleByName(name: RoleName): TfRoleRow | undefined {
  return queryOne<TfRoleRow>('SELECT * FROM tf_roles WHERE name = ?', [name]);
}

export function findRolesByUserId(userId: number): TfRoleRow[] {
  return queryAll<TfRoleRow>(
    `SELECT r.* FROM tf_roles r
     JOIN tf_user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?
     ORDER BY r.name ASC`,
    [userId]
  );
}

export function assignRole(userId: number, roleId: number): void {
  execute(
    'INSERT OR IGNORE INTO tf_user_roles (user_id, role_id) VALUES (?, ?)',
    [userId, roleId]
  );
}

export function unassignRole(userId: number, roleId: number): boolean {
  const { changes } = execute(
    'DELETE FROM tf_user_roles WHERE user_id = ? AND role_id = ?',
    [userId, roleId]
  );
  return changes > 0;
}

export function replaceUserRoles(userId: number, roleIds: number[]): void {
  execute('DELETE FROM tf_user_roles WHERE user_id = ?', [userId]);
  for (const roleId of roleIds) {
    execute('INSERT INTO tf_user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
  }
}
