import { z } from 'zod';

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'TEXTAREA'] as const;

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createFormSchema = z.object({
  studyId: z.number().int().positive(),
  name: z.string().min(1, 'name is required').max(200),
});

export const addFieldSchema = z.object({
  fieldKey: z.string().min(1, 'fieldKey is required').max(100).regex(/^[a-z][a-z0-9_]*$/, 'fieldKey must be lowercase snake_case'),
  label: z.string().min(1, 'label is required').max(200),
  fieldType: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  optionsJson: z.string().nullable().default(null),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateFieldSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  fieldType: z.enum(FIELD_TYPES).optional(),
  required: z.boolean().optional(),
  optionsJson: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type AddFieldInput = z.infer<typeof addFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
