import { useState } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { GET_AUDIT_LOGS_QUERY } from '../../services/adminService';
import { AuditLog } from '../../types';
import { fieldLabel, parseJson, diffObjects, summaryText } from '../../utils/auditDiff';

// ── Inline diff panel ─────────────────────────────────────────────────────
function DiffDetail({ log }: { log: AuditLog }) {
  const before = parseJson(log.beforeJson);
  const after = parseJson(log.afterJson);
  const isSnapshot = log.action === 'CREATE' || log.action === 'ASSIGN' || log.action === 'UNASSIGN';
  const snapshot = after ?? before;
  const changes = diffObjects(before, after);

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      {isSnapshot && snapshot ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(snapshot)
            .filter(([k]) => !['id', 'password'].includes(k))
            .map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {fieldLabel(k)}:
                </Typography>
                <Typography variant="caption" sx={{
                  px: 0.7, py: 0.15, borderRadius: 0.5, fontFamily: 'monospace',
                  bgcolor: log.action === 'UNASSIGN' ? '#fef2f2' : '#f0fdf4',
                  color: log.action === 'UNASSIGN' ? '#b91c1c' : '#15803d',
                }}>
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

// ── Page ──────────────────────────────────────────────────────────────────
const ENTITY_TYPES = ['', 'Study', 'Site', 'Examiner', 'ExaminerCertificate', 'StudySite', 'SiteExaminer', 'StudySiteExaminer'] as const;

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  // Accordion: only one row open at a time
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_AUDIT_LOGS_QUERY, {
    variables: { entityType: entityTypeFilter || undefined, page: page + 1, pageSize },
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

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Audit Logs</Typography>
          <Typography variant="body2" color="text.secondary">
            All admin actions — create, update, assign, and unassign. Click any row to see details.
          </Typography>
        </Box>
        <TextField
          select size="small" label="Filter by entity" value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(0);
            setExpandedRow(null);
          }}
          sx={{ minWidth: 160 }}
        >
          {ENTITY_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t || 'All entities'}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      {!loading && !error && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ width: 48, p: 0 }} />
                  <TableCell sx={{ fontWeight: 700, width: 170 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 210 }}>Changed By</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                )}
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
                            color={log.action === 'CREATE' ? 'success' : log.action === 'ASSIGN' ? 'info' : log.action === 'UNASSIGN' ? 'error' : 'warning'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.entityType} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">#{log.entityId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{summaryText(log)}</Typography>
                        </TableCell>
                      </TableRow>

                      {/* ── Inline diff row — immediately below the data row ── */}
                      <TableRow key={`diff-${log.id}`}>
                        <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
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
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handlePageSizeChange}
            sx={{ borderTop: '1px solid #e2e8f0' }}
          />
        </Paper>
      )}
    </AdminLayout>
  );
}
