import { useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useStudies } from '../../hooks/useStudies';
import { useUrlPagination } from '../../hooks/useUrlPagination';

export function ViewerStudiesPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { studies, total, loading, error } = useStudies(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();

  const columns: GridColDef[] = [
    { field: 'protocolId', headerName: 'Protocol ID', width: 120 },
    { field: 'title', headerName: 'Study Name', flex: 1, minWidth: 180 },
    { field: 'sponsor', headerName: 'Sponsor', width: 150 },
    { field: 'phase', headerName: 'Phase', width: 100 },
    { field: 'startDate', headerName: 'Start Date', width: 110 },
    { field: 'endDate', headerName: 'End Date', width: 110 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <ViewerLayout>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Studies</Typography>
        <Typography variant="body2" color="text.secondary">Click any row to view its related sites and examiners.</Typography>
      </Box>
      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={studies} columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]}
            autoHeight
            onRowClick={(p) => navigate(`/viewer/studies/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}
    </ViewerLayout>
  );
}
