import { z } from 'zod';

const CATEGORIES = ['Protocol', 'ICF', 'TMF', 'Other'] as const;
const DOC_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createDocumentSchema = z.object({
  studyId: z.number().int().positive(),
  title: z.string().min(1, 'title is required').max(300),
  category: z.enum(CATEGORIES),
});

export const addVersionSchema = z.object({
  documentId: z.number().int().positive(),
  fileRef: z.string().min(1, 'fileRef is required').max(1000),
});

export const setDocumentStatusSchema = z.object({
  documentId: z.number().int().positive(),
  status: z.enum(DOC_STATUSES),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type AddVersionInput = z.infer<typeof addVersionSchema>;
