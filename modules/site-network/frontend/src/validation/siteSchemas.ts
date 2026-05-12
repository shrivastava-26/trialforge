import { z } from 'zod';

const SITE_STATUSES = ['Planned', 'Active', 'Closed'] as const;

export const createSiteSchema = z.object({
  siteCode: z.string().min(1, 'Site code is required').max(50),
  name: z.string().min(1, 'Site name is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  // status intentionally absent — createSite always sets 'Planned'
});

export const updateSiteSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  status: z.enum(SITE_STATUSES, { message: 'Select a valid status' }),
});

export type CreateSiteFormValues = z.infer<typeof createSiteSchema>;
export type UpdateSiteFormValues = z.infer<typeof updateSiteSchema>;

export function nextAllowedSiteStatus(current: string): 'Active' | 'Closed' | null {
  if (current === 'Planned') return 'Active';
  if (current === 'Active') return 'Closed';
  return null;
}
