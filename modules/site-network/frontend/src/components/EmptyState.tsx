import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
}

export function EmptyState({ message, subMessage }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        bgcolor: '#f8fafc',
        borderRadius: 2,
        border: '1.5px dashed #cbd5e1',
      }}
    >
      <InboxIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
      <Typography variant="body1" sx={{ fontWeight: 600 }} color="text.secondary">
        {message}
      </Typography>
      {subMessage && (
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, textAlign: 'center' }}>
          {subMessage}
        </Typography>
      )}
    </Box>
  );
}
