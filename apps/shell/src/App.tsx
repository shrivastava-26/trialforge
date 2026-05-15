import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { theme } from './theme';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { setEnqueueError } from './apollo';

function SnackbarWiring() {
  const { enqueueSnackbar } = useSnackbar();
  useEffect(() => {
    setEnqueueError((msg) => enqueueSnackbar(msg, { variant: 'error' }));
  }, [enqueueSnackbar]);
  return null;
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={4000}>
        <SnackbarWiring />
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
