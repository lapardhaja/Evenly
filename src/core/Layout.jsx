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
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import useThemeMode from '../hooks/useThemeMode.js';
import ThemeModeMenu from './ThemeModeMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useProfileGate } from '../hooks/useProfileGate.js';
import { countIncomingFriendRequests, notifyPullToRefresh } from '../lib/friendsApi.js';
import PullToRefreshLayout from '../components/PullToRefreshLayout.jsx';

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
  const { ready: dataReady, cloudSync, syncError, clearSyncError, reloadFromServer } =
    useGroupsData();
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
    location.pathname === '/friends' ||
    location.pathname === '/profile' ||
    location.pathname === '/profile-setup';
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
    window.addEventListener('evenly-pull-to-refresh', onFriendsEvt);
    const id = window.setInterval(refreshFriendRequestCount, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('evenly-friend-requests-changed', onFriendsEvt);
      window.removeEventListener('evenly-pull-to-refresh', onFriendsEvt);
      window.clearInterval(id);
    };
  }, [refreshFriendRequestCount]);

  const handlePullRefresh = useCallback(async () => {
    await reloadFromServer();
    notifyPullToRefresh();
  }, [reloadFromServer]);

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
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, sm: 68 } }}>
            <Box
              component={Link}
              to={supabaseConfigured && !user ? '/login' : '/'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                minWidth: 0,
              }}
            >
              <Box
                component="img"
                src={new URL('../evenly-header-lockup.svg', import.meta.url).href}
                alt="Evenly"
                sx={{
                  display: 'block',
                  height: { xs: 28, sm: 32 },
                  width: 'auto',
                  maxWidth: { xs: 170, sm: 205 },
                }}
              />
            </Box>
            {supabaseConfigured && user && !onLoginRoute ? (
              <Box
                sx={{
                  ml: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  flexShrink: 0,
                  pl: 1,
                }}
              >
                <ThemeModeMenu themeMode={themeMode} onChange={setThemeMode} iconButtonSx={{}} />
                <IconButton
                  id="account-menu-button"
                  color="inherit"
                  aria-label="Open account menu"
                  aria-controls={accountAnchor ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(accountAnchor)}
                  onClick={(e) => setAccountAnchor(e.currentTarget)}
                  edge={false}
                >
                  <AccountCircleIcon />
                </IconButton>
              </Box>
            ) : (
              <ThemeModeMenu themeMode={themeMode} onChange={setThemeMode} iconButtonSx={{ ml: 'auto' }} />
            )}
            {supabaseConfigured && user && !onLoginRoute ? (
              <>
                <Menu
                  anchorEl={accountAnchor}
                  open={Boolean(accountAnchor)}
                  onClose={() => setAccountAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  id="account-menu"
                  MenuListProps={{ 'aria-labelledby': 'account-menu-button', dense: true }}
                  PaperProps={{ sx: { minWidth: 220 } }}
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
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/profile');
                    }}
                    selected={location.pathname === '/profile'}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/friends');
                    }}
                    selected={location.pathname === '/friends'}
                    aria-label={
                      pendingFriendRequests > 0
                        ? `Friends, ${pendingFriendRequests} pending requests`
                        : 'Friends'
                    }
                  >
                    <ListItemIcon>
                      <Badge
                        color="warning"
                        badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
                        max={99}
                        invisible={pendingFriendRequests === 0}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontWeight: 700,
                            fontSize: '0.6rem',
                            minWidth: 14,
                            height: 14,
                          },
                        }}
                      >
                        <PeopleIcon fontSize="small" />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary="Friends"
                      secondary={
                        pendingFriendRequests > 0 ? `${pendingFriendRequests} pending` : null
                      }
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'warning.main',
                      }}
                    />
                  </MenuItem>
                  <Divider />
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
              Couldn’t load your data. Tap Retry, or sign out and sign in again.
            </Alert>
          ) : null}
          {user && !onLoginRoute ? (
            <PullToRefreshLayout
              onRefresh={handlePullRefresh}
              disabled={!supabaseConfigured}
            >
              <Outlet />
            </PullToRefreshLayout>
          ) : (
            <Outlet />
          )}
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
