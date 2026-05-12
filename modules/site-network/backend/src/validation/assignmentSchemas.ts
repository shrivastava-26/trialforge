import { z } from 'zod';

export const idSchema = z.string().regex(/^\d+$/, 'ID must be a positive integer');

export const assignmentSchema = z.object({
  studyId: idSchema,
  siteId: idSchema,
});

export const siteExaminerSchema = z.object({
  siteId: idSchema,
  examinerId: idSchema,
});

export const studySiteExaminerSchema = z.object({
  studyId: idSchema,
  siteId: idSchema,
  examinerId: idSchema,
  certificateId: idSchema.optional(),
});

// Pagination for list pages: page ≥ 1, pageSize 1–100
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.number().int().min(1, 'Page size must be at least 1').max(100, 'Page size cannot exceed 100').default(10),
});

// Pagination for picker/autocomplete queries: allows up to 1000 rows.
// Used by getSites(pageSize:1000) and getExaminers(pageSize:1000) in picker hooks.
export const pickerPaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.number().int().min(1, 'Page size must be at least 1').max(1000, 'Page size cannot exceed 1000').default(10),
});

export const searchSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters').max(200),
  filters: z
    .object({
      entityType: z.enum(['Study', 'Site', 'Examiner']).optional(),
      studyStatus: z.string().optional(),
      studyPhase: z.string().optional(),
      siteCity: z.string().optional(),
      siteCountry: z.string().optional(),
      examinerRole: z.string().optional(),
    })
    .optional(),
});
