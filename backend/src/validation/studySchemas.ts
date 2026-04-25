import { z } from 'zod';

const STUDY_PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'] as const;
const STUDY_STATUSES = ['Planned', 'Active', 'Completed'] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Shared date-range refinement
function refineDates(data: { startDate?: string; endDate?: string }, ctx: z.RefinementCtx) {
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be on or after start date' });
  }
}

// createStudy:
//   - status absent — service always sets 'Planned'
//   - startDate required (today-check is in service)
//   - endDate OPTIONAL — frontend strips empty string before sending; backend receives undefined or valid date
export const createStudySchema = z
  .object({
    protocolId: z
      .string()
      .min(1, 'Protocol ID is required')
      .max(50, 'Protocol ID must be 50 characters or fewer')
      .transform((v) => v.trim().toUpperCase()),
    title: z.string().min(1, 'Study name is required').max(200),
    sponsor: z.string().min(1, 'Sponsor is required').max(200),
    phase: z.enum(STUDY_PHASES, { error: 'Invalid phase' }),
    startDate: z.string().regex(DATE_REGEX, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(DATE_REGEX, 'End date must be YYYY-MM-DD').optional(),
    description: z.string().max(1000).optional(),
  })
  .superRefine(refineDates);

export const updateStudySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    sponsor: z.string().min(1).max(200).optional(),
    phase: z.enum(STUDY_PHASES, { error: 'Invalid phase' }).optional(),
    startDate: z.string().regex(DATE_REGEX, 'Start date must be YYYY-MM-DD').optional(),
    endDate: z.string().regex(DATE_REGEX, 'End date must be YYYY-MM-DD').optional(),
    status: z.enum(STUDY_STATUSES, { error: 'Invalid status' }).optional(),
    description: z.string().max(1000).optional(),
  })
  .superRefine(refineDates);

export type CreateStudyValidated = z.infer<typeof createStudySchema>;
export type UpdateStudyValidated = z.infer<typeof updateStudySchema>;
