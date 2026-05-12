import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { GridColDef } from '@mui/x-data-grid';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useSite } from '../../hooks/useSite';

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.3 }} color="text.primary">{value || '—'}</Typography>
    </Box>
  );
}

export function ViewerSiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { site, loading, error } = useSite(id);

  const studyColumns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'sponsor', headerName: 'Sponsor', width: 140 },
    { field: 'phase', headerName: 'Phase', width: 100 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  const examinerColumns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <ViewerLayout>
      {loading && <DetailPageSkeleton infoFields={4} relatedSections={2} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !site && <Alert severity="warning">Site not found.</Alert>}
      {!loading && !error && site && (
        <>
          <DetailPageHeader backTo="/viewer/sites" backLabel="Sites" title={site.name} status={site.status} badge={site.siteCode} subtitle={`${site.city}, ${site.country}`} />
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Site Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Site Code" value={site.siteCode} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="City" value={site.city} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Country" value={site.country} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Status" value={site.status} /></Box>
            </Box>
          </Paper>
          <RelatedDataGrid title="Linked Studies" rows={site.studies ?? []} columns={studyColumns} emptyMessage="No studies linked to this site" emptySubMessage="This site has not been assigned to any clinical studies yet." />
          <RelatedDataGrid title="Assigned Examiners" rows={site.examiners ?? []} columns={examinerColumns} emptyMessage="No examiners at this site" emptySubMessage="No examiners have been assigned to this clinical site yet." />
        </>
      )}
    </ViewerLayout>
  );
}
