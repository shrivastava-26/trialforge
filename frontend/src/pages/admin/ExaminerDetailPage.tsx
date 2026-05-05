import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { GridColDef } from '@mui/x-data-grid';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useExaminer } from '../../hooks/useExaminer';
import { ADD_EXAMINER_CERTIFICATE_MUTATION, UPDATE_EXAMINER_CERTIFICATE_MUTATION } from '../../services/adminService';
import { GET_EXAMINER_QUERY } from '../../services/examinerService';
import { createCertificateSchema, updateCertificateSchema, CreateCertificateFormValues, UpdateCertificateFormValues } from '../../validation';
import { parseGqlError } from '../../utils/gqlErrors';
import { InfoField } from '../../components/InfoField';
import { isCertValid } from '../../utils/shared';
import { ExaminerCertificate } from '../../types';

// ── Add Certificate Dialog ────────────────────────────────────────────────
function AddCertificateDialog({ examinerId, open, onClose }: { examinerId: string; open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [addCert, { loading }] = useMutation(ADD_EXAMINER_CERTIFICATE_MUTATION, {
    refetchQueries: [{ query: GET_EXAMINER_QUERY, variables: { id: examinerId } }],
  });
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<CreateCertificateFormValues>({
    resolver: zodResolver(createCertificateSchema),
    defaultValues: { certificateId: '', expiresOn: '' },
  });

  function handleClose() { reset(); onClose(); }

  async function onSubmit(values: CreateCertificateFormValues) {
    try {
      await addCert({ variables: { examinerId, input: values } });
      enqueueSnackbar('Certificate added.', { variant: 'success' });
      handleClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof CreateCertificateFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Certificate</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Certificate ID" size="small" required {...register('certificateId')} error={!!errors.certificateId} helperText={errors.certificateId?.message} />
        <TextField label="Expires On" type="date" size="small" required slotProps={{ inputLabel: { shrink: true } }} {...register('expiresOn')} error={!!errors.expiresOn} helperText={errors.expiresOn?.message} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>{loading ? 'Adding…' : 'Add'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Certificate Dialog ───────────────────────────────────────────────
function EditCertificateDialog({ examinerId, cert, onClose }: { examinerId: string; cert: ExaminerCertificate; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateCert, { loading }] = useMutation(UPDATE_EXAMINER_CERTIFICATE_MUTATION, {
    refetchQueries: [{ query: GET_EXAMINER_QUERY, variables: { id: examinerId } }],
  });
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<UpdateCertificateFormValues>({
    resolver: zodResolver(updateCertificateSchema),
    defaultValues: { certificateId: cert.certificateId, expiresOn: cert.expiresOn },
  });

  async function onSubmit(values: UpdateCertificateFormValues) {
    try {
      await updateCert({ variables: { id: cert.id, input: values } });
      enqueueSnackbar('Certificate updated.', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const { code, message, fieldErrors } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof UpdateCertificateFormValues, { message: m }));
        enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Certificate</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Certificate ID" size="small" required {...register('certificateId')} error={!!errors.certificateId} helperText={errors.certificateId?.message} />
        <TextField label="Expires On" type="date" size="small" required slotProps={{ inputLabel: { shrink: true } }} {...register('expiresOn')} error={!!errors.expiresOn} helperText={errors.expiresOn?.message} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading || !isDirty}>{loading ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminExaminerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { examiner, loading, error } = useExaminer(id);
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<ExaminerCertificate | null>(null);

  const studyColumns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  const siteColumns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 180 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <AdminLayout>
      {loading && <DetailPageSkeleton infoFields={4} relatedSections={2} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !examiner && <Alert severity="warning">Examiner not found.</Alert>}
      {!loading && !error && examiner && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0 }}>
            <Box sx={{ flex: 1 }}>
              <DetailPageHeader backTo="/admin/examiners" backLabel="Examiners" title={examiner.name} status={examiner.status} badge={examiner.examinerCode} subtitle={`${examiner.role} · ${examiner.specialty}`} />
            </Box>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate(`/admin/examiners/${id}/history`)}
              sx={{ mt: 0.5, ml: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              History
            </Button>
          </Box>
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Examiner Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Code" value={examiner.examinerCode} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Role" value={examiner.role} /></Box>
              <Box sx={{ flex: '1 1 160px' }}><InfoField label="Specialty" value={examiner.specialty} /></Box>
              <Box sx={{ flex: '2 1 240px' }}><InfoField label="Email" value={examiner.email} /></Box>
            </Box>
          </Paper>
          <RelatedDataGrid title="Linked Studies" rows={examiner.studies ?? []} columns={studyColumns} emptyMessage="No studies linked" />
          <RelatedDataGrid title="Assigned Sites" rows={examiner.sites ?? []} columns={siteColumns} emptyMessage="No sites assigned" />

          {/* Certificates section */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Certificates</Typography>
                <Chip label={(examiner.certificates ?? []).length} size="small" sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }} />
              </Box>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddCertOpen(true)}>Add Certificate</Button>
            </Box>
            {(examiner.certificates ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No certificates on file.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Certificate ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expires On</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 100 }}>Status</TableCell>
                      <TableCell sx={{ width: 80 }} />
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
                        <TableCell>
                          <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingCert(cert)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {addCertOpen && <AddCertificateDialog examinerId={id!} open onClose={() => setAddCertOpen(false)} />}
          {editingCert && <EditCertificateDialog examinerId={id!} cert={editingCert} onClose={() => setEditingCert(null)} />}
        </>
      )}
    </AdminLayout>
  );
}
