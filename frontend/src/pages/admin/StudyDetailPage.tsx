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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import { GridColDef } from '@mui/x-data-grid';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DetailPageHeader } from '../../components/DetailPageHeader';
import { RelatedDataGrid } from '../../components/RelatedDataGrid';
import { StatusChip } from '../../components/StatusChip';
import { DetailPageSkeleton } from '../../components/skeletons';
import { useStudy } from '../../hooks/useStudy';
import { useSitesPicker } from '../../hooks/useSitesPicker';
import {
  ASSIGN_SITE_TO_STUDY,
  UNASSIGN_SITE_FROM_STUDY,
  ASSIGN_EXAMINER_TO_STUDY_SITE,
  UNASSIGN_EXAMINER_FROM_STUDY_SITE,
} from '../../services/adminService';
import { GET_STUDY_QUERY } from '../../services/studyService';
import { parseGqlError } from '../../utils/gqlErrors';
import { StudySite, StudySiteExaminer, Examiner, ExaminerCertificate } from '../../types';

interface SiteOption {
  id: string;
  siteCode: string;
  name: string;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.3 }} color="text.primary">
        {value || '—'}
      </Typography>
    </Box>
  );
}

// ── Certificate picker helper ─────────────────────────────────────────────────
function isCertValid(expiresOn: string): boolean {
  return expiresOn >= new Date().toISOString().slice(0, 10);
}

function CertificatePickerDialog(
  { examiner, onSelect, onClose }: {
    examiner: Examiner & { certificates?: ExaminerCertificate[] };
    onSelect: (certId: string) => void;
    onClose: () => void;
  }
) {
  const validCerts = (examiner.certificates ?? []).filter((c) => isCertValid(c.expiresOn));
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Select Certificate for {examiner.name}</DialogTitle>
      <DialogContent>
        {validCerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No valid certificates available.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {validCerts.map((cert) => (
              <Paper
                key={cert.id}
                elevation={0}
                sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, cursor: 'pointer', '&:hover': { borderColor: '#0f766e', bgcolor: '#f0fdfa' } }}
                onClick={() => onSelect(cert.id)}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{cert.certificateId}</Typography>
                <Typography variant="caption" color="text.secondary">Expires: {cert.expiresOn}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Per-site examiner assignment panel ────────────────────────────────────────
interface StudySitePanelProps {
  studyId: string;
  studySite: StudySite;
  refetchQuery: object;
  readOnly?: boolean;
}

function StudySitePanel({ studyId, studySite, refetchQuery, readOnly = false }: StudySitePanelProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { site, examiners: assignedExaminers, availableExaminers } = studySite;
  const [certPickerExaminer, setCertPickerExaminer] = useState<Examiner | null>(null);

  const [assignExaminer, { loading: assigning }] = useMutation(ASSIGN_EXAMINER_TO_STUDY_SITE, {
    refetchQueries: [refetchQuery],
  });
  const [unassignExaminer, { loading: unassigning }] = useMutation(UNASSIGN_EXAMINER_FROM_STUDY_SITE, {
    refetchQueries: [refetchQuery],
  });

  const assignedIds = new Set(assignedExaminers.map((e) => e.id));
  const isBusy = assigning || unassigning;

  // Find the assigned SSE entry for a given examiner to show its certificate
  function getAssignedEntry(examinerId: string): StudySiteExaminer | undefined {
    return assignedExaminers.find((e) => e.id === examinerId);
  }

  async function doAssign(examinerId: string, certificateId?: string) {
    try {
      await assignExaminer({ variables: { studyId, siteId: site.id, examinerId, certificateId } });
      const ex = availableExaminers.find((e) => e.id === examinerId);
      enqueueSnackbar(`${ex?.name ?? 'Examiner'} assigned to study at ${site.name}.`, { variant: 'success' });
    } catch (err: unknown) {
      const { code, message } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        enqueueSnackbar('Please fix validation errors: ' + message, { variant: 'warning' });
      } else {
        enqueueSnackbar(message || 'Operation failed.', { variant: 'error' });
      }
    }
  }

  async function handleToggle(examiner: Examiner, currentlyAssigned: boolean) {
    if (readOnly) {
      enqueueSnackbar('Completed studies are locked — examiner assignments cannot be changed.', { variant: 'warning' });
      return;
    }
    try {
      if (currentlyAssigned) {
        await unassignExaminer({ variables: { studyId, siteId: site.id, examinerId: examiner.id } });
        enqueueSnackbar(`${examiner.name} unassigned from study at ${site.name}.`, { variant: 'info' });
      } else {
        // Show certificate picker if valid certs exist; otherwise let backend reject
        const validCerts = (examiner.certificates ?? []).filter((c) => isCertValid(c.expiresOn));
        if (validCerts.length >= 1) {
          setCertPickerExaminer(examiner);
          return;
        }
        await doAssign(examiner.id);
      }
    } catch (err: unknown) {
      const { code, message } = parseGqlError(err);
      if (code === 'BAD_USER_INPUT') {
        enqueueSnackbar('Please fix validation errors: ' + message, { variant: 'warning' });
      } else {
        enqueueSnackbar(message || 'Operation failed.', { variant: 'error' });
      }
    }
  }

  async function handleCertSelected(certId: string) {
    if (!certPickerExaminer) return;
    setCertPickerExaminer(null);
    await doAssign(certPickerExaminer.id, certId);
  }

  return (
    <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
      {/* Site header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LocationOnIcon sx={{ fontSize: 18, color: '#0f766e' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary">
          {site.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {site.siteCode} · {site.city}, {site.country}
        </Typography>
        <StatusChip status={site.status} />
        <Chip
          label={`${assignedExaminers.length} / ${availableExaminers.length} assigned`}
          size="small"
          sx={{ ml: 'auto', bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }}
        />
      </Box>

      {site.status === 'Closed' ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          This site is Closed — examiner assignments are not available for Closed sites.
        </Typography>
      ) : availableExaminers.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No examiners assigned to this site yet. Assign examiners to the site first.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableExaminers.map((examiner) => {
            const isAssigned = assignedIds.has(examiner.id);
            const sseEntry = getAssignedEntry(examiner.id);
            return (
              <Paper
                key={examiner.id}
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1.5px solid ${isAssigned ? '#0f766e' : '#e2e8f0'}`,
                  bgcolor: isAssigned ? '#f0fdfa' : '#fafafa',
                  minWidth: 220,
                  flex: '1 1 220px',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isAssigned}
                      disabled={isBusy || readOnly}
                      onChange={() => handleToggle(examiner, isAssigned)}
                      size="small"
                      sx={{ color: '#0f766e', '&.Mui-checked': { color: '#0f766e' } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {examiner.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {examiner.examinerCode} · {examiner.role}
                      </Typography>
                      {isAssigned && sseEntry?.certificate && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#0f766e', fontWeight: 600, mt: 0.3 }}>
                          Cert: {sseEntry.certificate.certificateId} (exp {sseEntry.certificate.expiresOn})
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
            );
          })}
        </Box>
      )}

      {certPickerExaminer && (
        <CertificatePickerDialog
          examiner={certPickerExaminer}
          onSelect={handleCertSelected}
          onClose={() => setCertPickerExaminer(null)}
        />
      )}
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminStudyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { study, loading, error } = useStudy(id);
  const isCompleted = study?.status === 'Completed';
  const { sites: allSites } = useSitesPicker(!study || isCompleted);

  const refetchQuery = { query: GET_STUDY_QUERY, variables: { id } };
  const refetchOptions = { refetchQueries: [refetchQuery] };

  const [assignSite, { loading: assigning }] = useMutation(ASSIGN_SITE_TO_STUDY, refetchOptions);
  const [unassignSite] = useMutation(UNASSIGN_SITE_FROM_STUDY, refetchOptions);

  const [selectedSite, setSelectedSite] = useState<SiteOption | null>(null);

  const assignedSiteIds = new Set((study?.sites ?? []).map((s) => s.id));
  const unassignedSites = allSites.filter((s) => !assignedSiteIds.has(s.id));

  async function handleAssignSite() {
    if (!selectedSite || isCompleted) return;
    try {
      await assignSite({ variables: { studyId: id, siteId: selectedSite.id } });
      enqueueSnackbar(`${selectedSite.name} assigned to study.`, { variant: 'success' });
      setSelectedSite(null);
    } catch (err: unknown) {
      const { message } = parseGqlError(err);
      enqueueSnackbar(message || 'Failed to assign site.', { variant: 'error' });
    }
  }

  async function handleUnassignSite(siteId: string, siteName: string) {
    if (isCompleted) {
      enqueueSnackbar('Completed studies are locked — site assignments cannot be changed.', { variant: 'warning' });
      return;
    }
    try {
      await unassignSite({ variables: { studyId: id, siteId } });
      enqueueSnackbar(`${siteName} unassigned from study.`, { variant: 'info' });
    } catch (err: unknown) {
      const { message } = parseGqlError(err);
      enqueueSnackbar(message || 'Failed to unassign site.', { variant: 'error' });
    }
  }

  const siteColumns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 160 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    ...(!isCompleted ? [{
      field: 'unassign', headerName: '', width: 110, sortable: false,
      renderCell: (p: { row: { id: string; name: string } }) => (
        <Button size="small" color="error" onClick={() => handleUnassignSite(p.row.id, p.row.name)}>
          Unassign
        </Button>
      ),
    }] : []),
  ];

  const examinerColumns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <AdminLayout>
      {loading && <DetailPageSkeleton infoFields={6} relatedSections={3} />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && !study && <Alert severity="warning">Study not found.</Alert>}
      {!loading && !error && study && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0 }}>
            <Box sx={{ flex: 1 }}>
              <DetailPageHeader
                backTo="/admin/studies"
                backLabel="Studies"
                title={study.title}
                status={study.status}
                badge={study.protocolId}
                subtitle={`${study.sponsor} · ${study.phase}`}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate(`/admin/studies/${id}/history`)}
              sx={{ mt: 0.5, ml: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              History
            </Button>
          </Box>

          {/* Study info card */}
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

          {/* Assigned sites table */}
          <RelatedDataGrid
            title="Assigned Sites"
            rows={study.sites ?? []}
            columns={siteColumns}
            emptyMessage="No sites assigned to this study"
            emptySubMessage="Use the picker below to assign a site."
          />

          {/* Completed study lock banner */}
          {isCompleted && (
            <Alert severity="info" icon={<LockIcon fontSize="small" />} sx={{ mb: 3 }}>
              This study is <strong>Completed</strong> — site and examiner assignments are locked and cannot be modified.
            </Alert>
          )}

          {/* Assign site picker — hidden for completed studies */}
          {!isCompleted && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 4, borderRadius: 2, border: '1px dashed #cbd5e1' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Assign a Site</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Search by site code or name, then click Assign.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Autocomplete
                  options={unassignedSites}
                  value={selectedSite}
                  onChange={(_, value) => setSelectedSite(value)}
                  getOptionLabel={(o) => `${o.siteCode} — ${o.name}`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  noOptionsText={unassignedSites.length === 0 ? 'All sites are already assigned' : 'No sites match'}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Search site code or name…" sx={{ bgcolor: 'background.paper' }} />
                  )}
                  sx={{ flex: 1, minWidth: 260 }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddLinkIcon />}
                  onClick={handleAssignSite}
                  disabled={!selectedSite || assigning}
                  sx={{ whiteSpace: 'nowrap', height: 40 }}
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Per-site examiner assignment */}
          {(study.studySites ?? []).length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="text.primary">
                  Examiner Assignment per Site
                </Typography>
                <Chip
                  label={study.studySites!.length}
                  size="small"
                  sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Check which examiners participate in this study at each site. Only examiners already assigned to the site are shown.
              </Typography>
              {study.studySites!.map((ss) => (
                <StudySitePanel
                  key={ss.site.id}
                  studyId={id!}
                  studySite={ss}
                  refetchQuery={refetchQuery}
                  readOnly={isCompleted}
                />
              ))}
            </Box>
          )}

          {(study.studySites ?? []).length === 0 && (study.sites ?? []).length > 0 && (
            <Alert severity="info" sx={{ mb: 4 }}>
              Assign examiners to sites first, then return here to select which examiners participate in this study at each site.
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Study-level examiner summary (union across all sites) */}
          <RelatedDataGrid
            title="All Study Examiners (union across sites)"
            rows={study.examiners ?? []}
            columns={examinerColumns}
            emptyMessage="No examiners assigned to this study"
            emptySubMessage="Use the per-site panels above to assign examiners."
          />
        </>
      )}
    </AdminLayout>
  );
}
