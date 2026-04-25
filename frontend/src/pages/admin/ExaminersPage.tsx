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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
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

const stepperSx = {
  mb: 3,
  '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
  '& .MuiStepIcon-root.Mui-active': { color: '#0f766e' },
  '& .MuiStepIcon-root.Mui-completed': { color: '#0f766e' },
};

// ── Create Examiner (2 steps) ──────────────────────────────────────────────
// Step 1: Identity  — Examiner Code, Name, Role
// Step 2: Contact   — Specialty, Email
const CREATE_STEPS = ['Identity', 'Contact'];

function CreateExaminerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [createExaminer, { loading }] = useMutation(CREATE_EXAMINER_MUTATION, { refetchQueries: [GET_EXAMINERS_QUERY] });

  const { register, handleSubmit, setError, reset, trigger, formState: { errors } } =
    useForm<CreateExaminerFormValues>({
      resolver: zodResolver(createExaminerSchema),
      defaultValues: { examinerCode: '', name: '', specialty: '', email: '', role: 'Sub-Investigator', status: 'Active' },
      mode: 'onChange',
    });

  async function handleNext() {
    const valid = await trigger(['examinerCode', 'name', 'role']);
    if (valid) setActiveStep(1);
  }

  function handleClose() {
    reset();
    setActiveStep(0);
    onClose();
  }

  async function onSubmit(values: CreateExaminerFormValues) {
    try {
      await createExaminer({ variables: { input: values } });
      enqueueSnackbar('Examiner created successfully.', { variant: 'success' });
      handleClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof CreateExaminerFormValues, { message: m }));
        const step1Keys = ['examinerCode', 'name', 'role'];
        const step2Keys = ['specialty', 'email'];
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
      <DialogTitle>New Examiner</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={stepperSx}>
          {CREATE_STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {/* Step 1 — Identity */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Examiner Code" size="small" required
              {...register('examinerCode')} error={!!errors.examinerCode} helperText={errors.examinerCode?.message} />
            <TextField label="Name" size="small" required
              {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
            <TextField select label="Role" size="small" defaultValue="Sub-Investigator"
              {...register('role')} error={!!errors.role} helperText={errors.role?.message}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {/* Step 2 — Contact */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Specialty" size="small" required
              {...register('specialty')} error={!!errors.specialty} helperText={errors.specialty?.message} />
            <TextField label="Email" type="email" size="small" required
              {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
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

// ── Edit Examiner (2 steps) ────────────────────────────────────────────────
// Step 1: Profile   — Name, Role
// Step 2: Contact   — Specialty, Email
const EDIT_STEPS = ['Profile', 'Contact'];

function EditExaminerDialog({ examiner, onClose }: { examiner: Examiner; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [updateExaminer, { loading }] = useMutation(UPDATE_EXAMINER_MUTATION, { refetchQueries: [GET_EXAMINERS_QUERY] });

  const { register, handleSubmit, setError, trigger, formState: { errors, isDirty } } =
    useForm<UpdateExaminerFormValues>({
      resolver: zodResolver(updateExaminerSchema),
      defaultValues: { name: examiner.name, specialty: examiner.specialty, email: examiner.email, role: examiner.role as UpdateExaminerFormValues['role'], status: examiner.status },
      mode: 'onChange',
    });

  async function handleNext() {
    const valid = await trigger(['name', 'role']);
    if (valid) setActiveStep(1);
  }

  async function onSubmit(values: UpdateExaminerFormValues) {
    try {
      await updateExaminer({ variables: { id: examiner.id, input: values } });
      enqueueSnackbar('Examiner updated successfully.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof UpdateExaminerFormValues, { message: m }));
        const step1Keys = ['name', 'role'];
        const step2Keys = ['specialty', 'email'];
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
      <DialogTitle>Edit Examiner</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={stepperSx}>
          {EDIT_STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {/* Step 1 — Profile */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" size="small" required
              {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
            <TextField select label="Role" size="small" defaultValue={examiner.role}
              {...register('role')} error={!!errors.role} helperText={errors.role?.message}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {/* Step 2 — Contact */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Specialty" size="small"
              {...register('specialty')} error={!!errors.specialty} helperText={errors.specialty?.message} />
            <TextField label="Email" type="email" size="small"
              {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
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
