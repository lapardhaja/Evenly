import { useMemo, useEffect, useState, useCallback } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import useThemeMode from '../hooks/useThemeMode.js';
import ThemeModeMenu from './ThemeModeMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useProfileGate } from '../hooks/useProfileGate.js';
import { countIncomingFriendRequests } from '../lib/friendsApi.js';

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

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, configured: supabaseConfigured, loading: authLoading } = useAuth();
  const onLoginRoute =
    location.pathname === '/login' ||
    location.pathname === '/update-password' ||
    location.pathname === '/profile-setup' ||
    location.pathname.startsWith('/shared-settlement/');
  useProfileGate();
  const { ready: dataReady, cloudSync, syncError, clearSyncError } = useGroupsData();
  const [accountAnchor, setAccountAnchor] = useState(null);
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

  const skipDataWait =
    location.pathname === '/friends' || location.pathname === '/profile-setup';
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);

  const refreshFriendRequestCount = useCallback(async () => {
    if (!supabaseConfigured || !user || onLoginRoute || syncError || !dataReady) return;
    try {
      const n = await countIncomingFriendRequests();
      setPendingFriendRequests(n);
    } catch {
      setPendingFriendRequests(0);
    }
  }, [supabaseConfigured, user, onLoginRoute, syncError, dataReady]);

  useEffect(() => {
    refreshFriendRequestCount();
  }, [refreshFriendRequestCount, user?.id]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshFriendRequestCount();
    };
    const onFriendsEvt = () => refreshFriendRequestCount();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('evenly-friend-requests-changed', onFriendsEvt);
    const id = window.setInterval(refreshFriendRequestCount, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('evenly-friend-requests-changed', onFriendsEvt);
      window.clearInterval(id);
    };
  }, [refreshFriendRequestCount]);

  const showBootstrap =
    supabaseConfigured &&
    !onLoginRoute &&
    !skipDataWait &&
    (authLoading || (!!user && !dataReady));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Backdrop
        open={showBootstrap}
        sx={{ zIndex: (t) => t.zIndex.drawer + 10, color: '#fff', flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body2">Loading…</Typography>
      </Backdrop>
      <Box sx={{ flexGrow: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={2}>
          <Toolbar>
            <Box
              component={Link}
              to={supabaseConfigured && !user ? '/login' : '/'}
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
            {supabaseConfigured && user && !onLoginRoute ? (
              <Badge
                badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
                color="warning"
                max={99}
                invisible={pendingFriendRequests === 0}
                sx={{
                  mr: 1,
                  '& .MuiBadge-badge': {
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  },
                }}
              >
                <Button
                  component={Link}
                  to="/friends"
                  aria-label={
                    pendingFriendRequests > 0
                      ? `Friends, ${pendingFriendRequests} pending requests`
                      : 'Friends'
                  }
                  variant={pendingFriendRequests > 0 ? 'contained' : 'text'}
                  color={pendingFriendRequests > 0 ? 'warning' : 'inherit'}
                  sx={{
                    mr: 0,
                    textTransform: 'none',
                    fontWeight: pendingFriendRequests > 0 ? 700 : 400,
                    ...(pendingFriendRequests > 0 && {
                      boxShadow: (t) =>
                        t.palette.mode === 'dark'
                          ? '0 0 0 1px rgba(255,180,80,0.35)'
                          : '0 0 0 1px rgba(200,120,0,0.25)',
                    }),
                  }}
                >
                  Friends
                </Button>
              </Badge>
            ) : null}
            {supabaseConfigured && user && !onLoginRoute ? (
              <>
                <IconButton
                  color="inherit"
                  aria-label="account"
                  onClick={(e) => setAccountAnchor(e.currentTarget)}
                  edge="end"
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  anchorEl={accountAnchor}
                  open={Boolean(accountAnchor)}
                  onClose={() => setAccountAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <MenuItem disabled sx={{ opacity: '1 !important', maxWidth: 280 }}>
                    <Typography variant="caption" noWrap title={user.email}>
                      {user.email}
                    </Typography>
                  </MenuItem>
                  {cloudSync ? (
                    <MenuItem disabled sx={{ opacity: '1 !important' }}>
                      <Typography variant="caption" color="success.main">
                        Signed in
                      </Typography>
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      signOut();
                      navigate('/login', { replace: true });
                    }}
                  >
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : null}
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {supabaseConfigured && user && syncError && !onLoginRoute ? (
            <Alert
              severity="error"
              onClose={clearSyncError}
              action={
                <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              }
              sx={{ borderRadius: 0 }}
            >
              We couldn’t load your data. Tap Retry. If that doesn’t help, sign out and sign in again.
            </Alert>
          ) : null}
          <Outlet />
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
