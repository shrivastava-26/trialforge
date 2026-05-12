import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { AppHeader } from '../AppHeader';
import { AppFooter } from '../AppFooter';
import { AdminSidebar } from './AdminSidebar';

const APPBAR_HEIGHT = 64;

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppHeader showLogout />
      <Box sx={{ display: 'flex', flex: 1, mt: `${APPBAR_HEIGHT}px` }}>
        <AdminSidebar />
        <Box component="main" sx={{ flex: 1, p: 3, bgcolor: 'background.default', minHeight: `calc(100vh - ${APPBAR_HEIGHT}px)`, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
      <AppFooter />
    </Box>
  );
}
