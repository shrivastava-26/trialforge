import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isChecking, role } = useAuth();
  if (isChecking) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'ADMIN') return <Navigate to="/viewer/dashboard" replace />;
  return <>{children}</>;
}
