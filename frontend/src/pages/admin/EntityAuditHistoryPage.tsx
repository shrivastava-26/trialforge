import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TableSkeleton } from '../../components/TableSkeleton';
import { GET_AUDIT_LOGS_QUERY } from '../../services/adminService';
import { AuditLog } from '../../types';

// ── Shared diff helpers ───────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  protocolId: 'Protocol ID', title: 'Study Name', sponsor: 'Sponsor',
  phase: 'Phase', startDate: 'Start Date', endDate: 'End Date',
  status: 'Status', description: 'Description',
  siteCode: 'Site Code', name: 'Name', city: 'City', country: 'Country',
  examinerCode: 'Examiner Code', specialty: 'Specialty', email: 'Email', role: 'Role',
};
function fieldLabel(key: string): string { return FIELD_LABELS[key] ?? key; }

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

interface FieldChange { field: string; before: string; after: string; }

function diffObjects(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): FieldChange[] {
  if (!after) return [];
  const skip = new Set(['id', 'password']);
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const bVal = String(before?.[key] ?? '');
    const aVal = String(after[key] ?? '');
    if (bVal !== aVal) changes.push({ field: key, before: bVal, after: aVal });
  }
  return changes;
}

// ── Inline diff cell rendered below the row ───────────────────────────────
function DiffDetail({ log }: { log: AuditLog }) {
  const before = parseJson(log.beforeJson);
  const after = parseJson(log.afterJson);
  const isCreate = log.action === 'CREATE';
  const changes = diffObjects(before, after);

  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      {isCreate && after ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(after)
            .filter(([k]) => !['id', 'password'].includes(k))
            .map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {fieldLabel(k)}:
                </Typography>
                <Typography variant="caption" sx={{ px: 0.7, py: 0.15, bgcolor: '#f0fdf4', color: '#15803d', borderRadius: 0.5, fontFamily: 'monospace' }}>
                  {String(v ?? '—')}
                </Typography>
              </Box>
            ))}
        </Box>
      ) : changes.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          {changes.map((c) => (
            <Box key={c.field} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 110 }}>
                {fieldLabel(c.field)}
              </Typography>
              <Typography variant="caption" sx={{ px: 0.7, py: 0.15, bgcolor: '#fef2f2', color: '#b91c1c', borderRadius: 0.5, fontFamily: 'monospace', textDecoration: 'line-through' }}>
                {c.before || '—'}
              </Typography>
              <Typography variant="caption" color="text.disabled">→</Typography>
              <Typography variant="caption" sx={{ px: 0.7, py: 0.15, bgcolor: '#f0fdf4', color: '#15803d', borderRadius: 0.5, fontFamily: 'monospace' }}>
                {c.after || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          No field changes recorded.
        </Typography>
      )}
    </Box>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────
interface EntityAuditHistoryPageProps {
  entityType: 'Study' | 'Site' | 'Examiner';
  backTo: string;
  backLabel: string;
  /** Derive label from entity id param — shown in page header */
  entityLabel?: string;
}

// ── Page ──────────────────────────────────────────────────────────────────
export function EntityAuditHistoryPage({
  entityType,
  backTo,
  backLabel,
  entityLabel,
}: EntityAuditHistoryPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  // Track which row ids have their diff panel expanded
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, loading, error } = useQuery(GET_AUDIT_LOGS_QUERY, {
    variables: {
      entityType,
      entityId: Number(id),
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    },
    fetchPolicy: 'network-only',
    skip: !id,
  });

  const rows: AuditLog[] = data?.getAuditLogs?.rows ?? [];
  const total: number = data?.getAuditLogs?.total ?? 0;

  function toggleExpand(logId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) { next.delete(logId); } else { next.add(logId); }
      return next;
    });
  }

  const columns: GridColDef[] = [
    {
      field: 'expand',
      headerName: '',
      width: 48,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Tooltip title={expandedRows.has(String(p.row.id)) ? 'Hide changes' : 'Show changes'}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(String(p.row.id)); }}>
            {expandedRows.has(String(p.row.id))
              ? <ExpandLessIcon fontSize="small" />
              : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      ),
    },
    { field: 'createdAt', headerName: 'Timestamp', width: 170 },
    { field: 'actorEmail', headerName: 'Changed By', width: 210 },
    {
      field: 'action',
      headerName: 'Action',
      width: 100,
      renderCell: (p: GridRenderCellParams) => (
        <Chip
          label={p.value}
          size="small"
          color={p.value === 'CREATE' ? 'success' : 'warning'}
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
      ),
    },
    {
      field: 'summary',
      headerName: 'Summary',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const log = p.row as AuditLog;
        const before = parseJson(log.beforeJson);
        const after = parseJson(log.afterJson);
        const isCreate = log.action === 'CREATE';
        if (isCreate) {
          return <Typography variant="caption" color="text.secondary">Record created</Typography>;
        }
        const changes = diffObjects(before, after);
        if (changes.length === 0) {
          return <Typography variant="caption" color="text.disabled">No changes</Typography>;
        }
        return (
          <Typography variant="caption" color="text.secondary">
            {changes.map((c) => fieldLabel(c.field)).join(', ')} updated
          </Typography>
        );
      },
    },
  ];

  const label = entityLabel ?? `${entityType} #${id}`;

  return (
    <AdminLayout>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Tooltip title={`Back to ${backLabel}`}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography
          variant="body2" color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => navigate(-1)}
        >
          {backLabel}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <HistoryIcon sx={{ color: '#0f766e', fontSize: 22 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Change History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {entityType} · {label}
          </Typography>
        </Box>
        {!loading && (
          <Chip
            label={`${total} record${total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ ml: 1, bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700 }}
          />
        )}
      </Box>

      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && total === 0 && (
        <Alert severity="info">No history recorded for this {entityType.toLowerCase()} yet.</Alert>
      )}

      {!loading && !error && total > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => {
              setPaginationModel(model);
              setExpandedRows(new Set()); // collapse all on page change
            }}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            disableRowSelectionOnClick
            getRowHeight={(params) =>
              expandedRows.has(String(params.id)) ? 'auto' : 52
            }
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc', fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' },
              '& .MuiDataGrid-cell': { alignItems: 'flex-start', py: 0.5 },
            }}
            slots={{
              // Render the diff panel below each expanded row using getDetailPanelContent pattern
              // We use row height + custom cell rendering instead of detail panel for simplicity
            }}
          />
          {/* Render expanded diff panels below each visible row */}
          {rows.map((log) =>
            expandedRows.has(String(log.id)) ? (
              <Collapse key={`diff-${log.id}`} in timeout="auto">
                <DiffDetail log={log} />
              </Collapse>
            ) : null
          )}
        </Paper>
      )}
    </AdminLayout>
  );
}
