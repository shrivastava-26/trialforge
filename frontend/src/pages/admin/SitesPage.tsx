import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
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

function CreateSiteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createSite, { loading }] = useMutation(CREATE_SITE_MUTATION, { refetchQueries: [GET_SITES_QUERY] });
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<CreateSiteFormValues>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: { siteCode: '', name: '', city: '', country: '' },
  });

  async function onSubmit(values: CreateSiteFormValues) {
    try {
      await createSite({ variables: { input: values } });
      enqueueSnackbar('Site created successfully.', { variant: 'success' });
      reset();
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof CreateSiteFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Site</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Site Code" size="small" required {...register('siteCode')} error={!!errors.siteCode} helperText={errors.siteCode?.message} />
        <TextField label="Site Name" size="small" required {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="City" size="small" {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
        <TextField label="Country" size="small" {...register('country')} error={!!errors.country} helperText={errors.country?.message} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Status:</Typography>
          <Chip label="Planned" size="small" color="warning" variant="outlined" />
          <Typography variant="caption" color="text.disabled">(set automatically)</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function EditSiteDialog({ site, onClose }: { site: Site; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateSite, { loading }] = useMutation(UPDATE_SITE_MUTATION, { refetchQueries: [GET_SITES_QUERY] });
  const { register, handleSubmit, setError, formState: { errors } } = useForm<UpdateSiteFormValues>({
    resolver: zodResolver(updateSiteSchema),
    defaultValues: { name: site.name, city: site.city, country: site.country, status: site.status as UpdateSiteFormValues['status'] },
  });

  async function onSubmit(values: UpdateSiteFormValues) {
    try {
      await updateSite({ variables: { id: site.id, input: values } });
      enqueueSnackbar('Site updated successfully.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof UpdateSiteFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Site</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Site Name" size="small" required {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="City" size="small" {...register('city')} error={!!errors.city} helperText={errors.city?.message} />
        <TextField label="Country" size="small" {...register('country')} error={!!errors.country} helperText={errors.country?.message} />
        <TextField
          select label="Status" size="small" defaultValue={site.status}
          {...register('status')} error={!!errors.status}
          helperText={errors.status?.message ?? (site.status === 'Closed' ? 'Closed sites cannot be re-opened.' : undefined)}
          disabled={site.status === 'Closed'}
        >
          {STATUSES.filter((s) => site.status !== 'Closed' || s === 'Closed').map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

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
