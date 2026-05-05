import { useState } from 'react';
import { useMutation, DocumentNode } from '@apollo/client';
import { useSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { StatusChip } from '../StatusChip';
import { CertificatePickerDialog } from './CertificatePickerDialog';
import { isCertValid } from '../../utils/shared';
import { ASSIGN_EXAMINER_TO_STUDY_SITE, UNASSIGN_EXAMINER_FROM_STUDY_SITE } from '../../services/adminService';
import { parseGqlError } from '../../utils/gqlErrors';
import { StudySite, StudySiteExaminer, Examiner } from '../../types';

interface RefetchQuery {
  query: DocumentNode;
  variables: Record<string, unknown>;
}

interface StudySitePanelProps {
  studyId: string;
  studySite: StudySite;
  refetchQuery: RefetchQuery;
  readOnly?: boolean;
}

export function StudySitePanel({ studyId, studySite, refetchQuery, readOnly = false }: StudySitePanelProps) {
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
                  px: 1.5, py: 1, borderRadius: 1.5,
                  border: `1.5px solid ${isAssigned ? '#0f766e' : '#e2e8f0'}`,
                  bgcolor: isAssigned ? '#f0fdfa' : '#fafafa',
                  minWidth: 220, flex: '1 1 220px',
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
