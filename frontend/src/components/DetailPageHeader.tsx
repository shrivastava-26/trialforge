import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { StatusChip } from './StatusChip';

interface DetailPageHeaderProps {
  backTo: string;   // kept for the label display only
  backLabel: string;
  title: string;
  subtitle?: string;
  status?: string;
  badge?: string;
}

export function DetailPageHeader({ backTo: _backTo, backLabel, title, subtitle, status, badge }: DetailPageHeaderProps) {
  const navigate = useNavigate();

  // Always go back in browser history so the list page restores its exact
  // pagination state (?page=N&pageSize=N) instead of resetting to page 1.
  function goBack() {
    navigate(-1);
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Back link */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Tooltip title={`Back to ${backLabel}`}>
          <IconButton size="small" onClick={goBack} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={goBack}
        >
          {backLabel}
        </Typography>
      </Box>

      {/* Title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {badge && (
          <Box
            sx={{
              px: 1.2,
              py: 0.3,
              bgcolor: '#e0f2f1',
              color: '#0f766e',
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {badge}
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700 }} color="text.primary">
          {title}
        </Typography>
        {status && <StatusChip status={status} />}
      </Box>

      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
