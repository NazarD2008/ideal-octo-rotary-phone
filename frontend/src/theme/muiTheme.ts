import { createTheme } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
    success: { main: '#22c55e' },
    error: { main: '#ef4444' },
    background: {
      default: '#0f1720',
      paper: '#071022',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: "Roboto, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f1720',
          color: '#e6edf3',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#071022',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});

export default muiTheme;
