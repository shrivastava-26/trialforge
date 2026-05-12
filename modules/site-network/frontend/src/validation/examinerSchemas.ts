import { z } from 'zod';

const EXAMINER_ROLES = ['Principal Investigator', 'Sub-Investigator'] as const;

export const createExaminerSchema = z.object({
  examinerCode: z.string().min(1, 'Examiner code is required').max(50),
  name: z.string().min(1, 'Name is required').max(200),
  specialty: z.string().min(1, 'Specialty is required').max(100),
  email: z.string().email('Must be a valid email'),
  role: z.enum(EXAMINER_ROLES, { message: 'Select a valid role' }),
  status: z.string().optional(),
});

export const updateExaminerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  specialty: z.string().min(1, 'Specialty is required').max(100),
  email: z.string().email('Must be a valid email'),
  role: z.enum(EXAMINER_ROLES, { message: 'Select a valid role' }),
  status: z.string().optional(),
});

export type CreateExaminerFormValues = z.infer<typeof createExaminerSchema>;
export type UpdateExaminerFormValues = z.infer<typeof updateExaminerSchema>;

export const createCertificateSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required').max(100),
  expiresOn: z.string().min(1, 'Expiry date is required'),
});

export const updateCertificateSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required').max(100).optional(),
  expiresOn: z.string().min(1, 'Expiry date is required').optional(),
});

export type CreateCertificateFormValues = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateFormValues = z.infer<typeof updateCertificateSchema>;
