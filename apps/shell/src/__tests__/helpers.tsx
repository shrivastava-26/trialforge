import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { theme } from '../theme';

export function TestWrapper({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
