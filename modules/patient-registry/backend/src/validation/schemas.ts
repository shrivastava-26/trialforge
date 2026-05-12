import { z } from 'zod';

const PATIENT_STATUSES = ['SCREENED', 'ELIGIBLE', 'ENROLLED', 'WITHDRAWN', 'COMPLETED', 'ARCHIVED'] as const;

export const createPatientSchema = z.object({
  subjectId: z.string().min(1, 'subjectId is required').regex(/^[A-Z0-9\-]+$/, 'subjectId must be uppercase alphanumeric with hyphens'),
});

export const updatePatientSchema = z.object({
  subjectId: z.string().min(1).regex(/^[A-Z0-9\-]+$/, 'subjectId must be uppercase alphanumeric with hyphens').optional(),
  status: z.enum(PATIENT_STATUSES).optional(),
});

export const assignPatientSchema = z.object({
  patientId: z.number().int().positive(),
  studyId: z.string().min(1, 'studyId is required'),
  siteId: z.string().min(1, 'siteId is required'),
});

export const updateStudySubjectStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(PATIENT_STATUSES),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const getStudySubjectsSchema = z.object({
  studyId: z.string().min(1),
  siteId: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type AssignPatientInput = z.infer<typeof assignPatientSchema>;
