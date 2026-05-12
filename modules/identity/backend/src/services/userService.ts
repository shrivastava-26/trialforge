import { GraphQLError } from 'graphql';
import * as userRepo from '../repositories/userRepository';
import * as roleRepo from '../repositories/roleRepository';
import { hashPassword } from '../utils/password';
import { RoleName, TfUserRow, UserStatus } from '../types';
import { throwBadUserInput } from '../validation/helpers';

export interface UserWithRoles {
  id: number;
  email: string;
  status: UserStatus;
  roles: RoleName[];
  createdAt: string;
  updatedAt: string;
}

function toUserWithRoles(row: TfUserRow): UserWithRoles {
  const roles = roleRepo.findRolesByUserId(row.id).map((r) => r.name);
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUsers(page: number, pageSize: number): { rows: UserWithRoles[]; total: number } {
  const { rows, total } = userRepo.findUsers(page, pageSize);
  return { rows: rows.map(toUserWithRoles), total };
}

export function getUser(id: number): UserWithRoles {
  const row = userRepo.findUserById(id);
  if (!row) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return toUserWithRoles(row);
}

export function createUser(email: string, password: string, roles: RoleName[]): UserWithRoles {
  const existing = userRepo.findUserByEmail(email);
  if (existing) {
    throwBadUserInput({ email: 'Email already in use' }, 'Email already in use');
  }

  const passwordHash = hashPassword(password);
  const userId = userRepo.insertUser(email, passwordHash);

  // Assign roles
  for (const roleName of roles) {
    const role = roleRepo.findRoleByName(roleName);
    if (role) {
      roleRepo.assignRole(userId, role.id);
    }
  }

  return getUser(userId);
}

const VALID_STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  ACTIVE: ['INACTIVE', 'ARCHIVED'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [], // terminal — no transitions out
};

export function updateUser(
  id: number,
  input: { status?: UserStatus; password?: string; roles?: RoleName[] }
): UserWithRoles {
  const user = userRepo.findUserById(id);
  if (!user) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }

  if (input.status && input.status !== user.status) {
    const allowed = VALID_STATUS_TRANSITIONS[user.status];
    if (!allowed.includes(input.status)) {
      throwBadUserInput(
        { status: `Cannot transition from ${user.status} to ${input.status}` },
        `Cannot transition from ${user.status} to ${input.status}`
      );
    }
    userRepo.updateUserStatus(id, input.status);
  }

  if (input.password) {
    userRepo.updateUserPassword(id, hashPassword(input.password));
  }

  if (input.roles) {
    const roleIds: number[] = [];
    for (const roleName of input.roles) {
      const role = roleRepo.findRoleByName(roleName);
      if (!role) {
        throwBadUserInput({ roles: `Unknown role: ${roleName}` });
      }
      roleIds.push(role!.id);
    }
    roleRepo.replaceUserRoles(id, roleIds);
  }

  return getUser(id);
}

export function assignRoleToUser(userId: number, roleName: RoleName): UserWithRoles {
  const user = userRepo.findUserById(userId);
  if (!user) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }

  const role = roleRepo.findRoleByName(roleName);
  if (!role) {
    throwBadUserInput({ role: `Unknown role: ${roleName}` });
  }

  roleRepo.assignRole(userId, role!.id);
  return getUser(userId);
}

export function unassignRoleFromUser(userId: number, roleName: RoleName): UserWithRoles {
  const user = userRepo.findUserById(userId);
  if (!user) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }

  const role = roleRepo.findRoleByName(roleName);
  if (!role) {
    throwBadUserInput({ role: `Unknown role: ${roleName}` });
  }

  const removed = roleRepo.unassignRole(userId, role!.id);
  if (!removed) {
    throwBadUserInput(
      { role: `User does not have role: ${roleName}` },
      `User does not have role: ${roleName}`
    );
  }

  return getUser(userId);
}
