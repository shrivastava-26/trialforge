import { Box, Typography } from '@mui/material';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box p={3}>
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary" mt={1}>
        This module is under development.
      </Typography>
    </Box>
  );
}
