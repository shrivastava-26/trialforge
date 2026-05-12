import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ScienceIcon from '@mui/icons-material/Science';
import { useMutation, useApolloClient, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { LOGOUT_MUTATION, ME_QUERY } from '../services/authService';

interface AppHeaderProps {
  showLogout?: boolean;
}

export function AppHeader({ showLogout = false }: AppHeaderProps) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);
  const { data } = useQuery(ME_QUERY);

  const email: string = data?.me?.email ?? '';
  const initial = email.charAt(0).toUpperCase();

  const { enqueueSnackbar } = useSnackbar();

  async function handleLogout() {
    await logoutMutation();
    await client.resetStore();
    enqueueSnackbar('Signed out successfully.', { variant: 'info' });
    navigate('/login');
  }

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'primary.main',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <ScienceIcon sx={{ fontSize: 22 }} />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, letterSpacing: 0.3, flexGrow: 1 }}
        >
          SNA Clinical Studies
        </Typography>

        {showLogout && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={email} arrow>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.dark',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'default',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                fontSize: '0.8rem',
                py: 0.4,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
