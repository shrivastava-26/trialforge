import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 3,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} SNA Clinical Studies · All rights reserved
      </Typography>
    </Box>
  );
}
