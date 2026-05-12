import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isChecking } = useAuth();
  if (isChecking) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}
