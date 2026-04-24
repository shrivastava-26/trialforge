import { useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useSites } from '../../hooks/useSites';
import { useUrlPagination } from '../../hooks/useUrlPagination';

export function ViewerSitesPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { sites, total, loading, error } = useSites(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();

  const columns: GridColDef[] = [
    { field: 'siteCode', headerName: 'Site Code', width: 120 },
    { field: 'name', headerName: 'Site Name', flex: 1, minWidth: 200 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 130 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <ViewerLayout>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Sites</Typography>
        <Typography variant="body2" color="text.secondary">Click any row to view its related studies and examiners.</Typography>
      </Box>
      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={sites} columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]}
            autoHeight
            onRowClick={(p) => navigate(`/viewer/sites/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}
    </ViewerLayout>
  );
}
