import Chip from '@mui/material/Chip';

interface StatusChipProps {
  status: string;
}

const colorMap: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  Active: 'success',
  Planned: 'warning',
  Completed: 'default',
  Closed: 'error',
  Inactive: 'error',  // legacy fallback
};

export function StatusChip({ status }: StatusChipProps) {
  return (
    <Chip
      label={status}
      color={colorMap[status] ?? 'default'}
      size="small"
      variant="outlined"
    />
  );
}
