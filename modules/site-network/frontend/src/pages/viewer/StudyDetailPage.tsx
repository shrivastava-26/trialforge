import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { GridColDef } from '@mui/x-data-grid';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useStudy } from '../../hooks/useStudy';
import { StudySite, StudySiteExaminer } from '../../types';

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.3 }} color="text.primary">{value || '—'}</Typography>
    </Box>
  );
}

// Read-only per-site examiner panel for viewer
function ViewerStudySitePanel({ studySite }: { studySite: StudySite }) {
  const { site, examiners } = studySite;

  const examinerColumns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'certificate', headerName: 'Certificate', width: 200,
      renderCell: (p) => {
        const cert = (p.row as StudySiteExaminer).certificate;
        if (!cert) return <Typography variant="caption" color="text.secondary">—</Typography>;
        return (
          <Typography variant="caption">
            {cert.certificateId} (exp {cert.expiresOn})
          </Typography>
        );
      },
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Site header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <LocationOnIcon sx={{ fontSize: 16, color: '#0f766e' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary">
          {site.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {site.siteCode} · {site.city}, {site.country}
        </Typography>
        <StatusChip status={site.status} />
        <Chip
          label={`${examiners.length} examiner${examiners.length !== 1 ? 's' : ''}`}
          size="small"
          sx={{ ml: 'auto', bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }}
        />
      </Box>
      <RelatedDataGrid
        title=""
        rows={examiners}
        columns={examinerColumns}
        emptyMessage="No examiners assigned to this study at this site"
      />
    </Box>
  );
}

export function ViewerStudyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { study, loading, error } = useStudy(id);

  const siteColumns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Site Code', width: 120 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 180 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  // studySites with at least one assigned examiner — viewer only sees populated ones
  const populatedStudySites = (study?.studySites ?? []).filter((ss) => ss.examiners.length > 0);

  return (
    <ViewerLayout>
      {loading && <DetailPageSkeleton infoFields={6} relatedSections={3} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !study && <Alert severity="warning">Study not found.</Alert>}
      {!loading && !error && study && (
        <>
          <DetailPageHeader backTo="/viewer/studies" backLabel="Studies" title={study.title} status={study.status} badge={study.protocolId} subtitle={`${study.sponsor} · ${study.phase}`} />

          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Study Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Protocol ID" value={study.protocolId} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Sponsor" value={study.sponsor} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Phase" value={study.phase} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Start Date" value={study.startDate} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="End Date" value={study.endDate} /></Box>
              <Box sx={{ flex: '2 1 300px' }}><InfoField label="Description" value={study.description} /></Box>
            </Box>
          </Paper>

          <RelatedDataGrid
            title="Assigned Sites"
            rows={study.sites ?? []}
            columns={siteColumns}
            emptyMessage="No sites assigned to this study"
            emptySubMessage="This study has not been linked to any clinical sites yet."
          />

          {/* Per-site examiner breakdown — only examiners for THIS study at each site */}
          {populatedStudySites.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="text.primary">
                  Examiners by Site
                </Typography>
                <Chip
                  label={populatedStudySites.length}
                  size="small"
                  sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }}
                />
              </Box>
              {populatedStudySites.map((ss) => (
                <ViewerStudySitePanel key={ss.site.id} studySite={ss} />
              ))}
            </Box>
          )}

          {populatedStudySites.length === 0 && (
            <RelatedDataGrid
              title="Assigned Examiners"
              rows={study.examiners ?? []}
              columns={[
                { field: 'examinerCode', headerName: 'Code', width: 110 },
                { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
                { field: 'specialty', headerName: 'Specialty', width: 150 },
                { field: 'role', headerName: 'Role', width: 160 },
                { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
                { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
              ]}
              emptyMessage="No examiners assigned to this study"
              emptySubMessage="No examiners have been linked to this study's sites yet."
            />
          )}
        </>
      )}
    </ViewerLayout>
  );
}
