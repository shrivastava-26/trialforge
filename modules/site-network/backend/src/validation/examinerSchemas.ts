import { z } from 'zod';

const EXAMINER_ROLES = ['Principal Investigator', 'Sub-Investigator'] as const;

export const createExaminerSchema = z.object({
  examinerCode: z.string().min(1, 'Examiner code is required').max(50).transform((v) => v.trim().toUpperCase()),
  name: z.string().min(1, 'Name is required').max(200),
  specialty: z.string().min(1, 'Specialty is required').max(100),
  email: z.string().email('Must be a valid email'),
  role: z.enum(EXAMINER_ROLES, { error: 'Role must be Principal Investigator or Sub-Investigator' }),
  status: z.string().optional(),
});

export const updateExaminerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  specialty: z.string().min(1).max(100).optional(),
  email: z.string().email('Must be a valid email').optional(),
  role: z.enum(EXAMINER_ROLES, { error: 'Role must be Principal Investigator or Sub-Investigator' }).optional(),
  status: z.string().optional(),
});

export type CreateExaminerValidated = z.infer<typeof createExaminerSchema>;
export type UpdateExaminerValidated = z.infer<typeof updateExaminerSchema>;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createCertificateSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required').max(100).transform((v) => v.trim()),
  expiresOn: z.string().min(1, 'Expiry date is required').regex(DATE_REGEX, 'Must be YYYY-MM-DD format'),
});

export const updateCertificateSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required').max(100).transform((v) => v.trim()).optional(),
  expiresOn: z.string().min(1, 'Expiry date is required').regex(DATE_REGEX, 'Must be YYYY-MM-DD format').optional(),
});

export type CreateCertificateValidated = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateValidated = z.infer<typeof updateCertificateSchema>;
