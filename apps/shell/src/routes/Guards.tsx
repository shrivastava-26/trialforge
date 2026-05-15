import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type RoleName, ROLES } from '../auth';
import { CircularProgress, Box } from '@mui/material';

export function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();
  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

interface RoleRouteProps {
  allowed: RoleName[];
}

export function RoleRoute({ allowed }: RoleRouteProps) {
  const { roles, loading } = useAuth();
  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  const safeRoles = roles ?? [];
  const hasAccess =
    safeRoles.includes(ROLES.ADMIN) || safeRoles.some((r) => allowed.includes(r));

  return hasAccess ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
