import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createQuerySchema = z.object({
  formInstanceId: z.number().int().positive(),
  title: z.string().min(1, 'title is required').max(300),
  description: z.string().min(1, 'description is required').max(2000),
  message: z.string().min(1, 'initial message is required').max(2000),
});

export const postMessageSchema = z.object({
  queryId: z.number().int().positive(),
  message: z.string().min(1, 'message is required').max(2000),
});

export type CreateQueryInput = z.infer<typeof createQuerySchema>;
export type PostMessageInput = z.infer<typeof postMessageSchema>;
