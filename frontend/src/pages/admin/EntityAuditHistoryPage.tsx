import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { GET_AUDIT_LOGS_QUERY } from '../../services/adminService';
import { AuditLog } from '../../types';

// ── Diff helpers ──────────────────────────────────────────────────────────
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

function summaryText(log: AuditLog): string {
  if (log.action === 'CREATE') return 'Record created';
  const changes = diffObjects(parseJson(log.beforeJson), parseJson(log.afterJson));
  if (changes.length === 0) return 'No changes';
  return changes.map((c) => fieldLabel(c.field)).join(', ') + ' updated';
}

// ── Inline diff panel ─────────────────────────────────────────────────────
function DiffDetail({ log }: { log: AuditLog }) {
  const before = parseJson(log.beforeJson);
  const after = parseJson(log.afterJson);
  const isCreate = log.action === 'CREATE';
  const changes = diffObjects(before, after);

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {changes.map((c) => (
            <Box key={c.field} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 120 }}>
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
  entityLabel?: string;
}

// ── Page ──────────────────────────────────────────────────────────────────
export function EntityAuditHistoryPage({
  entityType,
  backTo: _backTo,
  backLabel,
  entityLabel,
}: EntityAuditHistoryPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // Accordion: only one row open at a time
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_AUDIT_LOGS_QUERY, {
    variables: { entityType, entityId: Number(id), page: page + 1, pageSize },
    fetchPolicy: 'network-only',
    skip: !id,
  });

  const rows: AuditLog[] = data?.getAuditLogs?.rows ?? [];
  const total: number = data?.getAuditLogs?.total ?? 0;

  function toggleExpand(logId: string) {
    setExpandedRow((prev) => (prev === logId ? null : logId));
  }

  function handlePageChange(_: unknown, newPage: number) {
    setPage(newPage);
    setExpandedRow(null);
  }

  function handlePageSizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPageSize(Number(e.target.value));
    setPage(0);
    setExpandedRow(null);
  }

  const label = entityLabel ?? `${entityType} #${id}`;

  return (
    <AdminLayout>
      {/* Back link */}
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

      {/* Page title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <HistoryIcon sx={{ color: '#0f766e', fontSize: 22 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Change History</Typography>
          <Typography variant="body2" color="text.secondary">{entityType} · {label}</Typography>
        </Box>
        {!loading && (
          <Chip
            label={`${total} record${total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ ml: 1, bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700 }}
          />
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && total === 0 && (
        <Alert severity="info">No history recorded for this {entityType.toLowerCase()} yet.</Alert>
      )}

      {!loading && !error && total > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {/* expand toggle column */}
                  <TableCell sx={{ width: 48, p: 0 }} />
                  <TableCell sx={{ fontWeight: 700, width: 170 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 210 }}>Changed By</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((log) => {
                  const isOpen = expandedRow === String(log.id);
                  return (
                    <>
                      {/* ── Data row ── */}
                      <TableRow
                        key={log.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isOpen ? '#f0fdfa' : undefined,
                          '& td': { borderBottom: isOpen ? 'none' : undefined },
                        }}
                        onClick={() => toggleExpand(String(log.id))}
                      >
                        <TableCell sx={{ p: 0, textAlign: 'center' }}>
                          <Tooltip title={isOpen ? 'Hide changes' : 'Show changes'}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(String(log.id)); }}>
                              {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{log.createdAt}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{log.actorEmail}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.action}
                            size="small"
                            color={log.action === 'CREATE' ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{summaryText(log)}</Typography>
                        </TableCell>
                      </TableRow>

                      {/* ── Inline diff row — immediately below the data row ── */}
                      <TableRow key={`diff-${log.id}`}>
                        <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <DiffDetail log={log} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handlePageSizeChange}
            sx={{ borderTop: '1px solid #e2e8f0' }}
          />
        </Paper>
      )}
    </AdminLayout>
  );
}
