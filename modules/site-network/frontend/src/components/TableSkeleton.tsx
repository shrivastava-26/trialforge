import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

// Mimics the column widths of the study table
const COLUMN_WIDTHS = [130, 200, 150, 110, 120, 120, 120, 200, 70];
const ROW_COUNT = 5;

export function TableSkeleton() {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, overflow: 'hidden' }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {COLUMN_WIDTHS.map((w, i) => (
          <Skeleton key={i} variant="text" width={w} height={20} />
        ))}
      </Box>

      {/* Data rows */}
      {Array.from({ length: ROW_COUNT }).map((_, row) => (
        <Box
          key={row}
          sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9' }}
        >
          {COLUMN_WIDTHS.map((w, col) => (
            <Skeleton key={col} variant="text" width={w} height={20} />
          ))}
        </Box>
      ))}
    </Box>
  );
}
