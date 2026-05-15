export const ROLES = {
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
  CRO_MANAGER: 'CRO_MANAGER',
  SITE_COORDINATOR: 'SITE_COORDINATOR',
  DATA_MANAGER: 'DATA_MANAGER',
  MONITOR: 'MONITOR',
  AUDITOR: 'AUDITOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
