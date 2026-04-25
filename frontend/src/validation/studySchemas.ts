import { z } from 'zod';

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'] as const;
const STATUSES = ['Planned', 'Active', 'Completed'] as const;

/** Returns today's local date as 'YYYY-MM-DD' for client-side UX hints.
 *  The backend uses UTC and is the authoritative source of truth. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// createStudy: no status field — backend always creates as 'Planned'
// endDate is optional — kept as plain string so react-hook-form errors render correctly.
// Empty string is stripped in onSubmit before sending to the server.
export const createStudySchema = z
  .object({
    protocolId: z
      .string()
      .min(1, 'Protocol ID is required')
      .max(50, 'Protocol ID must be 50 characters or fewer')
      .transform((v) => v.trim().toUpperCase()),
    title: z.string().min(1, 'Study name is required').max(200),
    sponsor: z.string().min(1, 'Sponsor is required').max(200),
    phase: z.enum(PHASES, { message: 'Select a valid phase' }),
    startDate: z.string().min(1, 'Start date is required'),
    // endDate is a plain optional string — no transform so errors.endDate renders correctly
    endDate: z.string().optional(),
    description: z.string().max(1000).optional(),
  })
  .refine((d) => !d.startDate || d.startDate >= todayLocal(), {
    message: 'Start date must be today or in the future',
    path: ['startDate'],
  })
  .refine((d) => !d.startDate || !d.endDate || !d.endDate.trim() || d.startDate <= d.endDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateStudySchema = z
  .object({
    title: z.string().min(1, 'Study name is required').max(200),
    sponsor: z.string().min(1, 'Sponsor is required').max(200),
    phase: z.enum(PHASES, { message: 'Select a valid phase' }),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    status: z.enum(STATUSES, { message: 'Select a valid status' }),
    description: z.string().max(1000).optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || !d.endDate.trim() || d.startDate <= d.endDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CreateStudyFormValues = z.infer<typeof createStudySchema>;
export type UpdateStudyFormValues = z.infer<typeof updateStudySchema>;

// Returns the only valid next status for a given current status, or null if terminal.
export function nextAllowedStatus(current: string): 'Active' | 'Completed' | null {
  if (current === 'Planned') return 'Active';
  if (current === 'Active') return 'Completed';
  return null;
}
