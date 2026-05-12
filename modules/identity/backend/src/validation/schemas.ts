import { z } from 'zod';

const ROLE_NAMES = ['ADMIN', 'CRO_MANAGER', 'SITE_COORDINATOR', 'DATA_MANAGER', 'MONITOR', 'AUDITOR'] as const;
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roles: z.array(z.enum(ROLE_NAMES)).min(1, 'At least one role is required'),
});

export const updateUserSchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  roles: z.array(z.enum(ROLE_NAMES)).optional(),
});

export const assignRoleSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(ROLE_NAMES),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
