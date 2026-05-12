import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0f766e',
      light: '#14b8a6',
      dark: '#0d5c56',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#94a3b8',
      dark: '#1e293b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    error: { main: '#dc2626' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
  },
  typography: {
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, backgroundColor: '#f8fafc' },
      },
    },
  },
});

export default theme;
