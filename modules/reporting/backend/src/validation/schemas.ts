import { z } from 'zod';

export const metricsFilterSchema = z.object({
  studyId: z.string().optional(),
  siteId: z.string().optional(),
});

export type MetricsFilterInput = z.infer<typeof metricsFilterSchema>;
