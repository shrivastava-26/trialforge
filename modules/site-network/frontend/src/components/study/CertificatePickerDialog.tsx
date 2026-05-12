import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { isCertValid } from '../../utils/shared';
import { Examiner, ExaminerCertificate } from '../../types';

interface CertificatePickerDialogProps {
  examiner: Examiner & { certificates?: ExaminerCertificate[] };
  onSelect: (certId: string) => void;
  onClose: () => void;
}

export function CertificatePickerDialog({ examiner, onSelect, onClose }: CertificatePickerDialogProps) {
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
                data-testid={`cert-option-${cert.id}`}
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
