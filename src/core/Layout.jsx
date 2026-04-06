import { useMemo, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Link } from 'react-router-dom';
import useThemeMode from '../hooks/useThemeMode.js';
import ThemeModeMenu from './ThemeModeMenu.jsx';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#178c95' },
    highlightedRowBg: '#fff8d6',
    tableBg: '#ffffff',
  },
  typography: {
    fontFamily: "'Roboto', system-ui, -apple-system, sans-serif",
  },
  shape: { borderRadius: 12 },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#26b0ba' },
    highlightedRowBg: '#362d00',
    tableBg: '#212121',
  },
  typography: {
    fontFamily: "'Roboto', system-ui, -apple-system, sans-serif",
  },
  shape: { borderRadius: 12 },
});

export default function Layout({ children }) {
  const { themeMode, setThemeMode, resolvedMode } = useThemeMode();
  const theme = useMemo(
    () => (resolvedMode === 'dark' ? darkTheme : lightTheme),
    [resolvedMode],
  );

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        resolvedMode === 'dark' ? '#1a1a1a' : '#178c95',
      );
    }
  }, [resolvedMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={2}>
          <Toolbar>
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box
                component="img"
                src={new URL('../evenly-logo-icon.svg', import.meta.url).href}
                alt="Evenly"
                sx={{ height: 32, width: 32 }}
              />
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Evenly
              </Typography>
            </Box>
            <ThemeModeMenu themeMode={themeMode} onChange={setThemeMode} />
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>

        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 2,
            px: 2,
            textAlign: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              &copy; {new Date().getFullYear()} Evenly
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Designed by Servet Lapardhaja
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
