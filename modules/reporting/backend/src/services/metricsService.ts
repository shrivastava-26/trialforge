import * as metricsRepo from '../repositories/metricsRepository';
import { DashboardMetrics, MetricsFilter, RoleName } from '../types';
import { throwBadUserInput } from '../validation/helpers';

export function getDashboardMetrics(
  filter: MetricsFilter,
  userRoles: RoleName[]
): DashboardMetrics {
  // SITE_COORDINATOR must provide siteId
  if (userRoles.includes('SITE_COORDINATOR') && !userRoles.includes('ADMIN')) {
    if (!filter.siteId) {
      throwBadUserInput(
        { siteId: 'siteId is required for SITE_COORDINATOR' },
        'siteId is required for SITE_COORDINATOR'
      );
    }
  }

  return metricsRepo.getMetrics(filter);
}
