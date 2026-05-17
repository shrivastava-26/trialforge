import { useState, useCallback } from 'react';
import { gql } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Skeleton,
  Alert,
  Grid,
} from '@mui/material';
import { gatewayClient } from '../apollo';
import { useAuth, ROLES } from '../auth';

export const GET_DASHBOARD_METRICS = gql`
  query GetDashboardMetrics($studyId: ID, $siteId: ID) {
    getDashboardMetrics(studyId: $studyId, siteId: $siteId) {
      patientsTotal
      patientsEnrolled
      patientsArchived
      visitsPlanned
      visitsCompleted
      visitsMissed
      formsActive
      formInstancesDraft
      formInstancesSubmitted
      queriesOpen
      queriesAnswered
      queriesClosed
      documentsTotal
      documentsArchived
      documentVersionsTotal
    }
  }
`;

interface Metrics {
  patientsTotal: number;
  patientsEnrolled: number;
  patientsArchived: number;
  visitsPlanned: number;
  visitsCompleted: number;
  visitsMissed: number;
  formsActive: number;
  formInstancesDraft: number;
  formInstancesSubmitted: number;
  queriesOpen: number;
  queriesAnswered: number;
  queriesClosed: number;
  documentsTotal: number;
  documentsArchived: number;
  documentVersionsTotal: number;
}

export function DashboardPage() {
  const { roles } = useAuth();
  const safeRoles = roles ?? [];
  const isSiteCoordinator = safeRoles.includes(ROLES.SITE_COORDINATOR);

  const [studyId, setStudyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = useCallback(async () => {
    if (isSiteCoordinator && !siteId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await gatewayClient.query({
        query: GET_DASHBOARD_METRICS,
        variables: {
          studyId: studyId.trim() || undefined,
          siteId: siteId.trim() || undefined,
        },
        fetchPolicy: 'no-cache',
      });
      setMetrics(data.getDashboardMetrics);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [isSiteCoordinator, studyId, siteId]);

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Dashboard
      </Typography>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          label="Study ID"
          size="small"
          value={studyId}
          onChange={(e) => setStudyId(e.target.value)}
        />
        <TextField
          label={isSiteCoordinator ? 'Site ID (required)' : 'Site ID'}
          size="small"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          required={isSiteCoordinator}
        />
        <Button variant="contained" onClick={handleLoad}>
          Load Metrics
        </Button>
      </Box>

      {isSiteCoordinator && !siteId.trim() && !metrics && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please provide a Site ID to view metrics.
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {loading && (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={100} />
            </Grid>
          ))}
        </Grid>
      )}

      {metrics && (
        <Grid container spacing={2} data-testid="metrics-grid">
          {Object.entries(metrics)
            .filter(([, value]) => typeof value === 'number')
            .map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {formatLabel(key)}
                  </Typography>
                  <Typography variant="h4">{value as number}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}
