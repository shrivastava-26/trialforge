import { forwardOperation } from './proxy';
import { getModuleUrl } from './moduleProxyService';
import type { GatewayContext } from '../types';

export async function getDashboardMetrics(
  args: { studyId?: string; siteId?: string },
  ctx: GatewayContext,
): Promise<Record<string, unknown>> {
  const data = await forwardOperation({
    url: getModuleUrl('reporting'),
    query: `query($studyId: ID, $siteId: ID) {
      getDashboardMetrics(studyId: $studyId, siteId: $siteId) {
        patientsTotal patientsEnrolled patientsArchived
        visitsPlanned visitsCompleted visitsMissed
        formsActive formInstancesDraft formInstancesSubmitted
        queriesOpen queriesAnswered queriesClosed
        documentsTotal documentsArchived documentVersionsTotal
      }
    }`,
    variables: args,
    req: ctx.req,
    res: ctx.res,
  });
  return data.getDashboardMetrics as Record<string, unknown>;
}
