import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { GridColDef } from '@mui/x-data-grid';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useExaminer } from '../../hooks/useExaminer';

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.3 }} color="text.primary">{value || '—'}</Typography>
    </Box>
  );
}

function isCertValid(expiresOn: string): boolean {
  return expiresOn >= new Date().toISOString().slice(0, 10);
}

export function ViewerExaminerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { examiner, loading, error } = useExaminer(id);

  const studyColumns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'sponsor', headerName: 'Sponsor', width: 140 },
    { field: 'phase', headerName: 'Phase', width: 100 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  const siteColumns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Site Code', width: 120 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 180 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <ViewerLayout>
      {loading && <DetailPageSkeleton infoFields={4} relatedSections={2} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !examiner && <Alert severity="warning">Examiner not found.</Alert>}
      {!loading && !error && examiner && (
        <>
          <DetailPageHeader backTo="/viewer/examiners" backLabel="Examiners" title={examiner.name} status={examiner.status} badge={examiner.examinerCode} subtitle={`${examiner.role} · ${examiner.specialty}`} />
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Examiner Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Code" value={examiner.examinerCode} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Role" value={examiner.role} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Specialty" value={examiner.specialty} /></Box>
              <Box sx={{ flex: '2 1 240px' }}><InfoField label="Email" value={examiner.email} /></Box>
            </Box>
          </Paper>
          <RelatedDataGrid title="Linked Studies" rows={examiner.studies ?? []} columns={studyColumns} emptyMessage="No studies linked to this examiner" emptySubMessage="This examiner has not been assigned to any studies yet." />
          <RelatedDataGrid title="Assigned Sites" rows={examiner.sites ?? []} columns={siteColumns} emptyMessage="No sites linked to this examiner" emptySubMessage="This examiner has not been assigned to any clinical sites yet." />

          {(examiner.certificates ?? []).length > 0 && (
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Certificates</Typography>
                <Chip label={examiner.certificates!.length} size="small" sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }} />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Certificate ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expires On</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 100 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examiner.certificates!.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>{cert.certificateId}</TableCell>
                        <TableCell>{cert.expiresOn}</TableCell>
                        <TableCell>
                          <Chip
                            label={isCertValid(cert.expiresOn) ? 'Valid' : 'Expired'}
                            size="small"
                            color={isCertValid(cert.expiresOn) ? 'success' : 'error'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </ViewerLayout>
  );
}
