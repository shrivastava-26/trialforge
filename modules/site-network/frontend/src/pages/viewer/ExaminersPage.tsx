import { useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { StatusChip } from '../../components/StatusChip';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useExaminers } from '../../hooks/useExaminers';
import { useUrlPagination } from '../../hooks/useUrlPagination';

export function ViewerExaminersPage() {
  const [paginationModel, setPaginationModel] = useUrlPagination(10);
  const { examiners, total, loading, error } = useExaminers(paginationModel.page + 1, paginationModel.pageSize);
  const navigate = useNavigate();

  const columns: GridColDef[] = [
    { field: 'examinerCode', headerName: 'Code', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'specialty', headerName: 'Specialty', width: 150 },
    { field: 'role', headerName: 'Role', width: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  ];

  return (
    <ViewerLayout>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Examiners</Typography>
        <Typography variant="body2" color="text.secondary">Click any row to view its related studies and sites.</Typography>
      </Box>
      {loading && <TableSkeleton />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !error && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <DataGrid rows={examiners} columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20]}
            autoHeight
            onRowClick={(p) => navigate(`/viewer/examiners/${p.row.id}`)}
            sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' } }}
          />
        </Box>
      )}
    </ViewerLayout>
  );
}
