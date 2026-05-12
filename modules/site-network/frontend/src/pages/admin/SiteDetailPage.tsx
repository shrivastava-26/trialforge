import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import AddLinkIcon from '@mui/icons-material/AddLink';
import HistoryIcon from '@mui/icons-material/History';
import { GridColDef } from '@mui/x-data-grid';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useSite } from '../../hooks/useSite';
import { useExaminersPickerLazy } from '../../hooks/useExaminersPicker';
import { ASSIGN_EXAMINER_TO_SITE, UNASSIGN_EXAMINER_FROM_SITE } from '../../services/adminService';
import { GET_SITE_QUERY } from '../../services/siteService';
import { parseGqlError } from '../../utils/gqlErrors';
import { InfoField } from '../../components/InfoField';

interface ExaminerOption {
  id: string;
  examinerCode: string;
  name: string;
  role: string;
}

export function AdminSiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { site, loading, error } = useSite(id);
  const isClosed = site?.status === 'Closed';
  const { load: loadExaminers, examiners: allExaminers } = useExaminersPickerLazy();

  const refetchOptions = { refetchQueries: [{ query: GET_SITE_QUERY, variables: { id } }] };
  const [assignExaminer, { loading: assigning }] = useMutation(ASSIGN_EXAMINER_TO_SITE, refetchOptions);
  const [unassignExaminer] = useMutation(UNASSIGN_EXAMINER_FROM_SITE, refetchOptions);

  // Autocomplete state
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerOption | null>(null);

  const assignedIds = new Set((site?.examiners ?? []).map((e) => e.id));
  const unassignedExaminers = allExaminers.filter((e) => !assignedIds.has(e.id));

  async function handleAssign() {
    if (!selectedExaminer) return;
    try {
      await assignExaminer({ variables: { siteId: id, examinerId: selectedExaminer.id } });
      enqueueSnackbar(`${selectedExaminer.name} assigned to site.`, { variant: 'success' });
      setSelectedExaminer(null);
    } catch (err: unknown) {
      const { message } = parseGqlError(err);
      enqueueSnackbar(message || 'Failed to assign examiner.', { variant: 'error' });
    }
  }

  async function handleUnassign(examinerId: string, examinerName: string) {
    try {
      await unassignExaminer({ variables: { siteId: id, examinerId } });
      enqueueSnackbar(`${examinerName} unassigned from site.`, { variant: 'info' });
    } catch (err: unknown) {
      const { message } = parseGqlError(err);
      enqueueSnackbar(message || 'Failed to unassign examiner.', { variant: 'error' });
    }
  }

  const studyColumns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  const examinerColumns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'unassign', headerName: '', width: 110, sortable: false,
      renderCell: (p) => (
        <Button size="small" color="error"
          onClick={() => handleUnassign(p.row.id, p.row.name)}>
          Unassign
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      {loading && <DetailPageSkeleton infoFields={4} relatedSections={2} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !site && <Alert severity="warning">Site not found.</Alert>}
      {!loading && !error && site && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0 }}>
            <Box sx={{ flex: 1 }}>
              <DetailPageHeader
                backTo="/admin/sites"
                backLabel="Sites"
                title={site.name}
                status={site.status}
                badge={site.siteCode}
                subtitle={`${site.city}, ${site.country}`}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate(`/admin/sites/${id}/history`)}
              sx={{ mt: 0.5, ml: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              History
            </Button>
          </Box>

          {/* Site info card */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Site Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Site Code" value={site.siteCode} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="City" value={site.city} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Country" value={site.country} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Status" value={site.status} /></Box>
            </Box>
          </Paper>

          {/* Assigned examiners table */}
          <RelatedDataGrid
            title="Assigned Examiners"
            rows={site.examiners ?? []}
            columns={examinerColumns}
            emptyMessage="No examiners assigned to this site"
            emptySubMessage="Use the search below to find and assign an examiner."
          />

          {/* Assign examiner — searchable autocomplete */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 4, borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Assign an Examiner
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Search by examiner code, name, or role, then click Assign.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Autocomplete
                options={unassignedExaminers}
                value={selectedExaminer}
                onOpen={() => loadExaminers()}
                onChange={(_, value) => setSelectedExaminer(value)}
                getOptionLabel={(o) => `${o.examinerCode} — ${o.name} (${o.role})`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                noOptionsText={
                  unassignedExaminers.length === 0
                    ? 'All examiners are already assigned'
                    : 'No examiners match your search'
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Search examiner code, name, or role…"
                    sx={{ bgcolor: 'background.paper' }}
                  />
                )}
                sx={{ flex: 1, minWidth: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<AddLinkIcon />}
                onClick={handleAssign}
                disabled={!selectedExaminer || assigning}
                sx={{ whiteSpace: 'nowrap', height: 40 }}
              >
                {assigning ? 'Assigning…' : 'Assign'}
              </Button>
            </Box>
          </Paper>

          {/* Linked studies */}
          <RelatedDataGrid
            title="Linked Studies"
            rows={site.studies ?? []}
            columns={studyColumns}
            emptyMessage="No studies linked to this site"
            emptySubMessage="Assign this site to a study from the Studies page."
          />
        </>
      )}
    </AdminLayout>
  );
}
