import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useStudies } from '../../hooks/useStudies';
import { useUrlPagination } from '../../hooks/useUrlPagination';
import { Study } from '../../types';
import { CREATE_STUDY_MUTATION, UPDATE_STUDY_MUTATION } from '../../services/adminService';
import { GET_STUDIES_QUERY } from '../../services/studyService';
import {
  createStudySchema,
  updateStudySchema,
  CreateStudyFormValues,
  UpdateStudyFormValues,
  nextAllowedStatus,
  todayLocal,
} from '../../validation';
import { parseGqlError } from '../../utils/gqlErrors';

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'] as const;

// ── Create form ────────────────────────────────────────────────────────────
function CreateStudyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createStudy, { loading }] = useMutation(CREATE_STUDY_MUTATION, { refetchQueries: [GET_STUDIES_QUERY] });
  const today = todayLocal();

  const { register, handleSubmit, setError, reset, control, formState: { errors } } = useForm<CreateStudyFormValues>({
    resolver: zodResolver(createStudySchema),
    defaultValues: { protocolId: '', title: '', sponsor: '', phase: 'Phase II', startDate: '', endDate: '', description: '' },
  });

  // Watch startDate so endDate min can update reactively
  const watchedStart = useWatch({ control, name: 'startDate' });

  async function onSubmit(values: CreateStudyFormValues) {
    try {
      await createStudy({ variables: { input: values } });
      enqueueSnackbar('Study created successfully.', { variant: 'success' });
      reset();
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof CreateStudyFormValues, { message: msg });
        });
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Study</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Protocol ID" size="small" required {...register('protocolId')} error={!!errors.protocolId} helperText={errors.protocolId?.message} />
        <TextField label="Study Name" size="small" required {...register('title')} error={!!errors.title} helperText={errors.title?.message} />
        <TextField label="Sponsor" size="small" {...register('sponsor')} error={!!errors.sponsor} helperText={errors.sponsor?.message} />
        <TextField select label="Phase" size="small" defaultValue="Phase II" {...register('phase')} error={!!errors.phase} helperText={errors.phase?.message}>
          {PHASES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        {/* startDate: must be >= today */}
        <TextField
          label="Start Date" type="date" size="small" required
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
          {...register('startDate')}
          error={!!errors.startDate}
          helperText={errors.startDate?.message ?? 'Must be today or in the future'}
        />
        {/* endDate: optional; must be >= startDate */}
        <TextField
          label="End Date (optional)" type="date" size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: watchedStart || today } }}
          {...register('endDate')}
          error={!!errors.endDate}
          helperText={errors.endDate?.message}
        />
        {/* Status is always Planned on creation — shown as read-only badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Status:</Typography>
          <Chip label="Planned" size="small" color="warning" variant="outlined" />
          <Typography variant="caption" color="text.disabled">(set automatically)</Typography>
        </Box>
        <TextField label="Description" size="small" multiline rows={2} {...register('description')} error={!!errors.description} helperText={errors.description?.message} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status helper text ─────────────────────────────────────────────────────
function statusHelperText(currentStatus: string, selectedStatus: string): string | undefined {
  if (currentStatus === 'Completed') return 'Completed studies cannot be changed.';
  if (selectedStatus === 'Active') return 'Requires: ≥1 site assigned, ≥1 examiner, start date ≤ today, no Closed sites.';
  if (selectedStatus === 'Completed') return 'Requires: end date ≤ today, ≥1 site, ≥1 examiner, no Active sites.';
  return undefined;
}

// ── Edit form ──────────────────────────────────────────────────────────────
function EditStudyDialog({ study, onClose }: { study: Study; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateStudy, { loading }] = useMutation(UPDATE_STUDY_MUTATION, { refetchQueries: [GET_STUDIES_QUERY] });
  const today = todayLocal();

  const { register, handleSubmit, setError, control, formState: { errors, isDirty } } = useForm<UpdateStudyFormValues>({
    resolver: zodResolver(updateStudySchema),
    defaultValues: {
      title: study.title,
      sponsor: study.sponsor,
      phase: study.phase as UpdateStudyFormValues['phase'],
      startDate: study.startDate,
      endDate: study.endDate || '',
      status: study.status as UpdateStudyFormValues['status'],
      description: study.description,
    },
  });

  const watchedStart = useWatch({ control, name: 'startDate' });
  const watchedStatus = useWatch({ control, name: 'status' });

  async function onSubmit(values: UpdateStudyFormValues) {
    try {
      await updateStudy({ variables: { id: study.id, input: values } });
      enqueueSnackbar('Study updated successfully.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof UpdateStudyFormValues, { message: msg });
        });
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  const allowedNext = nextAllowedStatus(study.status);
  const statusOptions: string[] = allowedNext ? [study.status, allowedNext] : [study.status];

  // For Planned studies, startDate must be >= today (UX hint; backend is authoritative)
  const startMin = study.status === 'Planned' ? today : undefined;
  // endDate min is always >= startDate
  const endMin = watchedStart || today;
  // When completing, endDate must be <= today
  const endMax = watchedStatus === 'Completed' ? today : undefined;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Study</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Study Name" size="small" required {...register('title')} error={!!errors.title} helperText={errors.title?.message} />
        <TextField label="Sponsor" size="small" {...register('sponsor')} error={!!errors.sponsor} helperText={errors.sponsor?.message} />
        <TextField select label="Phase" size="small" defaultValue={study.phase} {...register('phase')} error={!!errors.phase} helperText={errors.phase?.message}>
          {PHASES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField
          label="Start Date" type="date" size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: startMin } }}
          {...register('startDate')}
          error={!!errors.startDate}
          helperText={errors.startDate?.message ?? (study.status === 'Planned' ? 'Must be today or in the future' : undefined)}
        />
        <TextField
          label={watchedStatus === 'Completed' ? 'End Date (required to complete)' : 'End Date (optional)'}
          type="date" size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: endMin, max: endMax } }}
          {...register('endDate')}
          error={!!errors.endDate}
          helperText={errors.endDate?.message ?? (watchedStatus === 'Completed' ? 'Must be today or earlier' : undefined)}
        />
        <TextField
          select label="Status" size="small"
          defaultValue={study.status}
          {...register('status')}
          error={!!errors.status}
          helperText={errors.status?.message ?? statusHelperText(study.status, watchedStatus ?? study.status)}
          disabled={study.status === 'Completed'}
        >
          {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField label="Description" size="small" multiline rows={2} {...register('description')} error={!!errors.description} helperText={errors.description?.message} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading || !isDirty}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export function AdminStudiesPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { studies, total, loading, error } = useStudies(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);

  const columns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'sponsor', headerName: 'Sponsor', width: 150 },
    { field: 'phase', headerName: 'Phase', width: 100 },
    { field: 'startDate', headerName: 'Start', width: 110 },
    { field: 'endDate', headerName: 'End', width: 110 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (p) => (
        <Button size="small" startIcon={<EditIcon />} onClick={(e) => { e.stopPropagation(); setEditingStudy(p.row as Study); }}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Studies</Typography>
          <Typography variant="body2" color="text.secondary">Click a row to view details. Use Edit to update.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Study</Button>
      </Box>

      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={studies} columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]}
            autoHeight
            onRowClick={(p) => navigate(`/admin/studies/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}

      {createOpen && <CreateStudyDialog open onClose={() => setCreateOpen(false)} />}
      {editingStudy && <EditStudyDialog study={editingStudy} onClose={() => setEditingStudy(null)} />}
    </AdminLayout>
  );
}
