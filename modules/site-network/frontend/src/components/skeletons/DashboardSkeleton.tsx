import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

// ── Stat card skeleton ─────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 200px' }}>
      <Skeleton variant="rounded" width={52} height={52} sx={{ flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="50%" height={36} />
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="55%" height={14} />
      </Box>
    </Paper>
  );
}

// ── Chart panel skeleton ───────────────────────────────────────────────────
function ChartPanelSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0', flex: '1 1 220px', minWidth: 0 }}>
      <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width="100%" height={260} />
    </Paper>
  );
}

// ── Recent studies list skeleton ───────────────────────────────────────────
function RecentStudiesSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0', flex: '2 1 400px', minWidth: 0 }}>
      <Skeleton variant="text" width={140} height={24} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="40%" height={14} />
            </Box>
            <Skeleton variant="rounded" width={70} height={24} sx={{ ml: 2, flexShrink: 0, borderRadius: 999 }} />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ── Country list skeleton ──────────────────────────────────────────────────
function CountryListSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0', flex: '1 1 240px', minWidth: 0 }}>
      <Skeleton variant="text" width={130} height={24} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="55%" height={16} />
              <Skeleton variant="text" width="35%" height={13} />
            </Box>
            <Skeleton variant="circular" width={28} height={28} />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ── Status pill bar skeleton ───────────────────────────────────────────────
function StatusBarSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Skeleton variant="text" width={90} height={20} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={80} height={24} sx={{ borderRadius: 999 }} />
      ))}
      <Skeleton variant="text" width={100} height={20} sx={{ ml: 1 }} />
      <Skeleton variant="text" width={110} height={20} />
    </Paper>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <Box>
      {/* Page title */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={120} height={32} />
        <Skeleton variant="text" width={280} height={20} />
      </Box>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </Box>

      {/* Status pill bar */}
      <StatusBarSkeleton />

      {/* Charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => <ChartPanelSkeleton key={i} />)}
      </Box>

      {/* Recent studies + country list */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <RecentStudiesSkeleton />
        <CountryListSkeleton />
      </Box>
    </Box>
  );
}
