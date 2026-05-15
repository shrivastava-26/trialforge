import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { AppRoutes } from '../routes';

export function AppShell() {
  const { isLoggedIn, email, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {isLoggedIn && (
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="h6"
              sx={{ cursor: 'pointer', flexGrow: 1 }}
              onClick={() => navigate('/dashboard')}
            >
              TrialForge
            </Typography>
            <Button color="inherit" onClick={() => navigate('/modules')}>
              Modules
            </Button>
            <Typography variant="body2" sx={{ mx: 2 }}>
              {email}
            </Typography>
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>
      )}
      <Box component="main">
        <AppRoutes />
      </Box>
    </>
  );
}
