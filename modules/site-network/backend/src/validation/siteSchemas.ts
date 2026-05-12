import { z } from 'zod';

const SITE_STATUSES = ['Planned', 'Active', 'Closed'] as const;

export const createSiteSchema = z.object({
  siteCode: z.string().min(1, 'Site code is required').max(50).transform((v) => v.trim().toUpperCase()),
  name: z.string().min(1, 'Site name is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  // status intentionally absent — createSite always sets 'Planned'
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  status: z.enum(SITE_STATUSES, { error: 'Invalid status' }).optional(),
});

export type CreateSiteValidated = z.infer<typeof createSiteSchema>;
export type UpdateSiteValidated = z.infer<typeof updateSiteSchema>;
