import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VISIT_STATUSES = ['PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED', 'ARCHIVED'] as const;

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createVisitTemplateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  dayOffset: z.number().int().min(0, 'dayOffset must be >= 0'),
  windowMinDays: z.number().int().default(0),
  windowMaxDays: z.number().int().default(0),
});

export const updateVisitTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dayOffset: z.number().int().min(0).optional(),
  windowMinDays: z.number().int().optional(),
  windowMaxDays: z.number().int().optional(),
});

export const schedulePatientVisitSchema = z.object({
  studySubjectId: z.number().int().positive(),
  visitTemplateId: z.number().int().positive(),
  scheduledDate: z.string().regex(DATE_REGEX, 'scheduledDate must be YYYY-MM-DD'),
});

export const completePatientVisitSchema = z.object({
  id: z.number().int().positive(),
  completedDate: z.string().regex(DATE_REGEX, 'completedDate must be YYYY-MM-DD'),
});

export const updatePatientVisitStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(VISIT_STATUSES),
});

export type CreateVisitTemplateInput = z.infer<typeof createVisitTemplateSchema>;
export type UpdateVisitTemplateInput = z.infer<typeof updateVisitTemplateSchema>;
