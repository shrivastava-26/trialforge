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
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useExaminers } from '../../hooks/useExaminers';
import { useUrlPagination } from '../../hooks/useUrlPagination';
import { Examiner } from '../../types';
import { CREATE_EXAMINER_MUTATION, UPDATE_EXAMINER_MUTATION } from '../../services/adminService';
import { GET_EXAMINERS_QUERY } from '../../services/examinerService';
import { createExaminerSchema, updateExaminerSchema, CreateExaminerFormValues, UpdateExaminerFormValues } from '../../validation';
import { parseGqlError } from '../../utils/gqlErrors';

const ROLES = ['Principal Investigator', 'Sub-Investigator'] as const;

function CreateExaminerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createExaminer, { loading }] = useMutation(CREATE_EXAMINER_MUTATION, { refetchQueries: [GET_EXAMINERS_QUERY] });
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<CreateExaminerFormValues>({
    resolver: zodResolver(createExaminerSchema),
    defaultValues: { examinerCode: '', name: '', specialty: '', email: '', role: 'Sub-Investigator', status: 'Active' },
  });

  async function onSubmit(values: CreateExaminerFormValues) {
    try {
      await createExaminer({ variables: { input: values } });
      enqueueSnackbar('Examiner created successfully.', { variant: 'success' });
      reset();
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof CreateExaminerFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Examiner</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Examiner Code" size="small" required {...register('examinerCode')} error={!!errors.examinerCode} helperText={errors.examinerCode?.message} />
        <TextField label="Name" size="small" required {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="Specialty" size="small" {...register('specialty')} error={!!errors.specialty} helperText={errors.specialty?.message} />
        <TextField label="Email" type="email" size="small" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField select label="Role" size="small" defaultValue="Sub-Investigator" {...register('role')} error={!!errors.role} helperText={errors.role?.message}>
          {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function EditExaminerDialog({ examiner, onClose }: { examiner: Examiner; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateExaminer, { loading }] = useMutation(UPDATE_EXAMINER_MUTATION, { refetchQueries: [GET_EXAMINERS_QUERY] });
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<UpdateExaminerFormValues>({
    resolver: zodResolver(updateExaminerSchema),
    defaultValues: { name: examiner.name, specialty: examiner.specialty, email: examiner.email, role: examiner.role as UpdateExaminerFormValues['role'], status: examiner.status },
  });

  async function onSubmit(values: UpdateExaminerFormValues) {
    try {
      await updateExaminer({ variables: { id: examiner.id, input: values } });
      enqueueSnackbar('Examiner updated successfully.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof UpdateExaminerFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Examiner</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Name" size="small" required {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="Specialty" size="small" {...register('specialty')} error={!!errors.specialty} helperText={errors.specialty?.message} />
        <TextField label="Email" type="email" size="small" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField select label="Role" size="small" defaultValue={examiner.role} {...register('role')} error={!!errors.role} helperText={errors.role?.message}>
          {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading || !isDirty}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminExaminersPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { examiners, total, loading, error } = useExaminers(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExaminer, setEditingExaminer] = useState<Examiner | null>(null);

  const columns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (p) => (
        <Button size="small" startIcon={<EditIcon />} onClick={(e) => { e.stopPropagation(); setEditingExaminer(p.row as Examiner); }}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Examiners</Typography>
          <Typography variant="body2" color="text.secondary">Click a row to view details.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Examiner</Button>
      </Box>

      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={examiners} columns={columns}
            rowCount={total} paginationMode="server"
            paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]} autoHeight
            onRowClick={(p) => navigate(`/admin/examiners/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}

      {createOpen && <CreateExaminerDialog open onClose={() => setCreateOpen(false)} />}
      {editingExaminer && <EditExaminerDialog examiner={editingExaminer} onClose={() => setEditingExaminer(null)} />}
    </AdminLayout>
  );
}
