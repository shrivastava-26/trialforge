import { z } from 'zod';

export const saveFormResponseSchema = z.object({
  formInstanceId: z.number().int().positive(),
  responseJson: z.string().min(1, 'responseJson is required'),
});

export type SaveFormResponseInput = z.infer<typeof saveFormResponseSchema>;
