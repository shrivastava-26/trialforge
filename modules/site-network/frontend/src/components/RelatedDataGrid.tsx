import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { EmptyState } from './EmptyState';

interface RelatedDataGridProps {
  title: string;
  rows: object[];
  columns: GridColDef[];
  emptyMessage: string;
  emptySubMessage?: string;
}

export function RelatedDataGrid({ title, rows, columns, emptyMessage, emptySubMessage }: RelatedDataGridProps) {
  return (
    <Box sx={{ mb: 4 }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="text.primary">
          {title}
        </Typography>
        <Chip
          label={rows.length}
          size="small"
          sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700, fontSize: '0.72rem' }}
        />
      </Box>

      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} subMessage={emptySubMessage} />
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            pageSizeOptions={[5, 10]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc', fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f0fdfa' },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
