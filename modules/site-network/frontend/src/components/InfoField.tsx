import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface InfoFieldProps {
  label: string;
  value: string;
}

export function InfoField({ label, value }: InfoFieldProps) {
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
