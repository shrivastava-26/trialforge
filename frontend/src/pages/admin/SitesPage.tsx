import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useSites } from '../../hooks/useSites';
import { useUrlPagination } from '../../hooks/useUrlPagination';
import { Site } from '../../types';
import { CREATE_SITE_MUTATION, UPDATE_SITE_MUTATION } from '../../services/adminService';
import { GET_SITES_QUERY } from '../../services/siteService';
import { createSiteSchema, updateSiteSchema, CreateSiteFormValues, UpdateSiteFormValues } from '../../validation';
import { parseGqlError } from '../../utils/gqlErrors';

const STATUSES = ['Planned', 'Active', 'Closed'] as const;

const stepperSx = {
  mb: 3,
  '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
  '& .MuiStepIcon-root.Mui-active': { color: '#0f766e' },
  '& .MuiStepIcon-root.Mui-completed': { color: '#0f766e' },
};

// ── Create Site (2 steps) ──────────────────────────────────────────────────
// Step 1: Identity  — Site Code, Name
// Step 2: Location  — City, Country
const CREATE_STEPS = ['Identity', 'Location'];

function CreateSiteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [createSite, { loading }] = useMutation(CREATE_SITE_MUTATION, { refetchQueries: [GET_SITES_QUERY] });

  const { register, handleSubmit, setError, reset, trigger, formState: { errors } } =
    useForm<CreateSiteFormValues>({
      resolver: zodResolver(createSiteSchema),
      defaultValues: { siteCode: '', name: '', city: '', country: '' },
      mode: 'onChange',
    });

  async function handleNext() {
    const valid = await trigger(['siteCode', 'name']);
    if (valid) setActiveStep(1);
  }

  function handleClose() {
    reset();
    setActiveStep(0);
    onClose();
  }

  async function onSubmit(values: CreateSiteFormValues) {
    try {
      await createSite({ variables: { input: values } });
      enqueueSnackbar('Site created successfully.', { variant: 'success' });
      handleClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof CreateSiteFormValues, { message: m }));
        const step1Keys = ['siteCode', 'name'];
        const step2Keys = ['city', 'country'];
        const errorKeys = Object.keys(fieldErrors);
        if (errorKeys.some((k) => step1Keys.includes(k))) { setActiveStep(0); }
        else if (errorKeys.some((k) => step2Keys.includes(k))) { setActiveStep(1); }
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Site</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={stepperSx}>
          {CREATE_STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {/* Step 1 — Identity */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Site Code" size="small" required
              {...register('siteCode')} error={!!errors.siteCode} helperText={errors.siteCode?.message} />
            <TextField label="Site Name" size="small" required
              {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">Status:</Typography>
              <Chip label="Planned" size="small" color="warning" variant="outlined" />
              <Typography variant="caption" color="text.disabled">(set automatically)</Typography>
            </Box>
          </Box>
        )}

        {/* Step 2 — Location */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="City" size="small" required
              {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
            <TextField label="Country" size="small" required
              {...register('country')} error={!!errors.country} helperText={errors.country?.message} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ mr: 'auto' }}>Cancel</Button>
        {activeStep > 0 && <Button onClick={() => setActiveStep(0)}>Back</Button>}
        {activeStep < CREATE_STEPS.length - 1
          ? <Button variant="contained" onClick={handleNext}>Next</Button>
          : <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Site (2 steps) ────────────────────────────────────────────────────
// Step 1: Details   — Name, Status
// Step 2: Location  — City, Country
const EDIT_STEPS = ['Details', 'Location'];

function EditSiteDialog({ site, onClose }: { site: Site; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [updateSite, { loading }] = useMutation(UPDATE_SITE_MUTATION, { refetchQueries: [GET_SITES_QUERY] });

  const { register, handleSubmit, setError, trigger, formState: { errors, isDirty } } =
    useForm<UpdateSiteFormValues>({
      resolver: zodResolver(updateSiteSchema),
      defaultValues: { name: site.name, city: site.city, country: site.country, status: site.status as UpdateSiteFormValues['status'] },
      mode: 'onChange',
    });

  async function handleNext() {
    const valid = await trigger(['name', 'status']);
    if (valid) setActiveStep(1);
  }

  async function onSubmit(values: UpdateSiteFormValues) {
    try {
      await updateSite({ variables: { id: site.id, input: values } });
      enqueueSnackbar('Site updated successfully.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof UpdateSiteFormValues, { message: m }));
        const step1Keys = ['name', 'status'];
        const step2Keys = ['city', 'country'];
        const errorKeys = Object.keys(fieldErrors);
        if (errorKeys.some((k) => step1Keys.includes(k))) { setActiveStep(0); }
        else if (errorKeys.some((k) => step2Keys.includes(k))) { setActiveStep(1); }
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Site</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={stepperSx}>
          {EDIT_STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {/* Step 1 — Details */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Site Name" size="small" required
              {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
            <TextField select label="Status" size="small" defaultValue={site.status}
              {...register('status')} error={!!errors.status}
              helperText={errors.status?.message ?? (site.status === 'Closed' ? 'Closed sites cannot be re-opened.' : undefined)}
              disabled={site.status === 'Closed'}>
              {STATUSES.filter((s) => site.status !== 'Closed' || s === 'Closed').map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {/* Step 2 — Location */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="City" size="small"
              {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
            <TextField label="Country" size="small"
              {...register('country')} error={!!errors.country} helperText={errors.country?.message} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ mr: 'auto' }}>Cancel</Button>
        {activeStep > 0 && <Button onClick={() => setActiveStep(0)}>Back</Button>}
        {activeStep < EDIT_STEPS.length - 1
          ? <Button variant="contained" onClick={handleNext}>Next</Button>
          : <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading || !isDirty}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export function AdminSitesPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { sites, total, loading, error } = useSites(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const columns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Site Code', width: 120 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 200 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 130 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (p) => (
        <Button size="small" startIcon={<EditIcon />} onClick={(e) => { e.stopPropagation(); setEditingSite(p.row as Site); }}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Sites</Typography>
          <Typography variant="body2" color="text.secondary">Click a row to manage examiners and linked studies.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Site</Button>
      </Box>

      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={sites} columns={columns}
            rowCount={total} paginationMode="server"
            paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]} autoHeight
            onRowClick={(p) => navigate(`/admin/sites/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}

      {createOpen && <CreateSiteDialog open onClose={() => setCreateOpen(false)} />}
      {editingSite && <EditSiteDialog site={editingSite} onClose={() => setEditingSite(null)} />}
    </AdminLayout>
  );
}
