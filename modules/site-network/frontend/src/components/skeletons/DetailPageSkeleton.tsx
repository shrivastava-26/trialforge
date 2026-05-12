import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

// ── Info card skeleton — mimics the field grid inside the detail card ──────
function InfoCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
      {/* Card title */}
      <Skeleton variant="text" width={120} height={22} sx={{ mb: 2 }} />
      {/* Field grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
        {Array.from({ length: fields }).map((_, i) => (
          <Box key={i} sx={{ flex: '1 1 160px' }}>
            <Skeleton variant="text" width="50%" height={13} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="80%" height={18} />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ── Related DataGrid section skeleton ─────────────────────────────────────
function RelatedGridSkeleton() {
  return (
    <Box sx={{ mb: 4 }}>
      {/* Section header: title + count chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Skeleton variant="text" width={130} height={22} />
        <Skeleton variant="rounded" width={28} height={20} sx={{ borderRadius: 999 }} />
      </Box>
      {/* Mini table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', gap: 3, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {[110, 180, 130, 100, 90].map((w, i) => (
            <Skeleton key={i} variant="text" width={w} height={18} />
          ))}
        </Box>
        {/* Data rows */}
        {Array.from({ length: 3 }).map((_, row) => (
          <Box key={row} sx={{ display: 'flex', gap: 3, px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            {[110, 180, 130, 100, 90].map((w, col) => (
              <Skeleton key={col} variant="text" width={w} height={18} />
            ))}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
interface DetailPageSkeletonProps {
  /** Number of info fields in the top card. Defaults to 4. */
  infoFields?: number;
  /** Number of related grid sections to show. Defaults to 2. */
  relatedSections?: number;
}

export function DetailPageSkeleton({ infoFields = 4, relatedSections = 2 }: DetailPageSkeletonProps) {
  return (
    <Box>
      {/* Back link */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Skeleton variant="circular" width={28} height={28} />
        <Skeleton variant="text" width={80} height={18} />
      </Box>

      {/* Title row: badge + title + status chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Skeleton variant="rounded" width={90} height={26} sx={{ borderRadius: 1 }} />
        <Skeleton variant="text" width={240} height={30} />
        <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 999 }} />
      </Box>
      {/* Subtitle */}
      <Skeleton variant="text" width={200} height={18} sx={{ mb: 3 }} />

      {/* Info card */}
      <InfoCardSkeleton fields={infoFields} />

      {/* Related grid sections */}
      {Array.from({ length: relatedSections }).map((_, i) => (
        <RelatedGridSkeleton key={i} />
      ))}
    </Box>
  );
}
