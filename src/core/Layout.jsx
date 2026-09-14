import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
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
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Link from '@mui/material/Link';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import useThemeMode from '../hooks/useThemeMode.js';
import ThemeModeMenu from './ThemeModeMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useProfileGate } from '../hooks/useProfileGate.js';
import {
  countIncomingFriendRequests,
  formatFullName,
  getProfilesByIds,
  incomingFriendRequestSnackText,
  isIncomingPendingFriendRequest,
  notifyFriendRequestsChanged,
  notifyPullToRefresh,
  subscribeToFriendRequests,
} from '../lib/friendsApi.js';
import { countUnreadConversations, subscribeToAllMessages } from '../lib/chatApi.js';
import {
  EVENLY_CHAT_OPEN_EVENT,
  alertIncomingChat,
  incomingChatPreview,
  parseIncomingChatMessage,
  requestChatNotificationPermission,
  shouldAlertIncomingChat,
} from '../lib/chatAlerts.js';
import { syncChatPushSubscription } from '../lib/chatPushClient.js';
import { visualViewportBottomGap } from '../lib/visualViewportBottom.js';
import PullToRefreshLayout from '../components/PullToRefreshLayout.jsx';
import EvenlyHeaderLockup from '../components/EvenlyHeaderLockup.jsx';
import CookieNotice from '../components/CookieNotice.jsx';
import AppTabBar from '../components/AppTabBar.jsx';
import { LEGAL_NAV } from '../pages/legal/legalNav.js';
import { FAB_OVERLAY_ROOT_ID } from './FabPortal.jsx';
import {
  APP_SHELL_HEIGHT,
  appLegalFooterSx,
  appShellFooterPinMainSx,
  appShellFooterPinSx,
  isChatComposerRoute,
  isPublicExemptRoute,
  isPullToRefreshDisabledForRoute,
  pullToRefreshScrollSx,
  shouldShowAppLegalFooter,
  shouldUsePullToRefreshLayout,
  shouldShowAppTabBar,
  appTabFromPath,
  APP_TAB_BAR_HEIGHT_PX,
} from '../lib/appShell.js';

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

/** In-flow legal strip — not shell chrome, so FABs can sit above Safari/Chrome toolbars. */
function AppLegalFooter() {
  return (
    <Box component="footer" sx={appLegalFooterSx}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          &copy; {new Date().getFullYear()} Evenly
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Designed by Servet Lapardhaja
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
          {LEGAL_NAV.map((item) => (
            <Link key={item.to} component={RouterLink} to={item.to} variant="caption">
              {item.label}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function AppMainColumn({ showFooter }) {
  if (!showFooter) return <Outlet />;
  return (
    <Box sx={appShellFooterPinSx}>
      <Box sx={appShellFooterPinMainSx}>
        <Outlet />
      </Box>
      <AppLegalFooter />
    </Box>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, configured: supabaseConfigured, loading: authLoading } = useAuth();
  const onLoginRoute = isPublicExemptRoute(location.pathname);
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

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const vv = window.visualViewport;
      const gap = visualViewportBottomGap({
        innerHeight: window.innerHeight,
        height: vv?.height ?? window.innerHeight,
        offsetTop: vv?.offsetTop ?? 0,
      });
      root.style.setProperty('--evenly-vv-bottom', `${gap}px`);
    };
    sync();
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      root.style.removeProperty('--evenly-vv-bottom');
    };
  }, []);

  const skipDataWait =
    location.pathname === '/friends' ||
    location.pathname === '/search' ||
    location.pathname === '/profile' ||
    location.pathname === '/profile-setup' ||
    location.pathname === '/chat' ||
    location.pathname.startsWith('/chat/') ||
    location.pathname === '/share' ||
    location.pathname.startsWith('/share/');
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [friendSnack, setFriendSnack] = useState('');
  const [chatSnack, setChatSnack] = useState(null);
  const locationPathRef = useRef(location.pathname);
  locationPathRef.current = location.pathname;
  const openChatIdRef = useRef('');

  const refreshFriendRequestCount = useCallback(async () => {
    if (!supabaseConfigured || !user || onLoginRoute) return;
    try {
      const n = await countIncomingFriendRequests();
      setPendingFriendRequests(n);
    } catch {
      setPendingFriendRequests(0);
    }
  }, [supabaseConfigured, user, onLoginRoute]);

  const refreshUnreadChats = useCallback(async () => {
    if (!supabaseConfigured || !user || onLoginRoute) return;
    try {
      const n = await countUnreadConversations();
      setUnreadChats(n);
    } catch {
      setUnreadChats(0);
    }
  }, [supabaseConfigured, user, onLoginRoute]);

  useEffect(() => {
    refreshFriendRequestCount();
  }, [refreshFriendRequestCount, user?.id]);

  useEffect(() => {
    if (!supabaseConfigured || !user || onLoginRoute) return undefined;
    const myId = user.id;
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshFriendRequestCount();
    };
    const onFriendsEvt = () => refreshFriendRequestCount();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('evenly-friend-requests-changed', onFriendsEvt);
    window.addEventListener('evenly-pull-to-refresh', onFriendsEvt);
    const unsub = subscribeToFriendRequests(async (payload) => {
      refreshFriendRequestCount();
      notifyFriendRequestsChanged();
      if (!isIncomingPendingFriendRequest(payload, myId)) return;
      const path = locationPathRef.current;
      if (path === '/friends' || path === '/search' || path.startsWith('/search/')) return;
      const fromId = payload?.new?.from_user_id;
      let name = '';
      if (fromId) {
        try {
          const [pr] = await getProfilesByIds([fromId]);
          name = formatFullName(pr) || pr?.username || pr?.display_name || '';
        } catch {
          name = '';
        }
      }
      setFriendSnack(incomingFriendRequestSnackText(name));
    });
    const id = window.setInterval(refreshFriendRequestCount, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('evenly-friend-requests-changed', onFriendsEvt);
      window.removeEventListener('evenly-pull-to-refresh', onFriendsEvt);
      unsub();
      window.clearInterval(id);
    };
  }, [refreshFriendRequestCount, supabaseConfigured, user, onLoginRoute]);

  useEffect(() => {
    refreshUnreadChats();
  }, [refreshUnreadChats, user?.id]);

  useEffect(() => {
    const onOpen = (e) => {
      openChatIdRef.current = e?.detail?.conversationId || '';
    };
    window.addEventListener(EVENLY_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(EVENLY_CHAT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !user || onLoginRoute) return undefined;
    const myId = user.id;
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshUnreadChats();
    };
    const onChatEvt = () => refreshUnreadChats();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('evenly-chat-unread-changed', onChatEvt);
    window.addEventListener('evenly-pull-to-refresh', onChatEvt);
    const unsub = subscribeToAllMessages((payload) => {
      refreshUnreadChats();
      const message = parseIncomingChatMessage(payload);
      if (
        !shouldAlertIncomingChat({
          myUserId: myId,
          message,
          openConversationId: openChatIdRef.current,
          visibilityState: document.visibilityState,
        })
      ) {
        return;
      }
      void alertIncomingChat({
        title: 'Evenly',
        body: incomingChatPreview(message),
        tag: message.conversationId,
      }).catch(() => {});
      setChatSnack({
        text: incomingChatPreview(message),
        to: `/chat/${message.conversationId}`,
      });
    });
    const id = window.setInterval(refreshUnreadChats, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('evenly-chat-unread-changed', onChatEvt);
      window.removeEventListener('evenly-pull-to-refresh', onChatEvt);
      unsub();
      window.clearInterval(id);
    };
  }, [refreshUnreadChats, supabaseConfigured, user, onLoginRoute]);

  useEffect(() => {
    if (!supabaseConfigured || !user || onLoginRoute) return undefined;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return undefined;
    }
    const sync = () => {
      void syncChatPushSubscription().catch(() => {});
    };
    sync();
    const sw = navigator.serviceWorker;
    sw?.addEventListener?.('controllerchange', sync);
    return () => {
      sw?.removeEventListener?.('controllerchange', sync);
    };
  }, [supabaseConfigured, user, onLoginRoute]);

  const handlePullRefresh = useCallback(async () => {
    await reloadFromServer();
    notifyPullToRefresh();
  }, [reloadFromServer]);

  const pullToRefreshDisabledForRoute = isPullToRefreshDisabledForRoute(location.pathname);
  const usesPullToRefreshLayout = shouldUsePullToRefreshLayout(onLoginRoute);
  const showAppLegalFooter = shouldShowAppLegalFooter(location.pathname);
  const hideAppBar = isChatComposerRoute(location.pathname);
  const isCompactNav = useMediaQuery(lightTheme.breakpoints.down('md'));
  const signedInShell = !onLoginRoute && (!supabaseConfigured || !!user);
  const showTabBar = isCompactNav && signedInShell && shouldShowAppTabBar(location.pathname);
  const showHeaderTabs = !isCompactNav && signedInShell && shouldShowAppTabBar(location.pathname);
  const currentTab = appTabFromPath(location.pathname);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      '--evenly-tab-bar-offset',
      showTabBar ? `${APP_TAB_BAR_HEIGHT_PX}px` : '0px',
    );
    return () => {
      root.style.setProperty('--evenly-tab-bar-offset', '0px');
    };
  }, [showTabBar]);

  const goTab = useCallback(
    (next) => {
      if (next === 'home') navigate('/');
      else if (next === 'search') navigate('/search');
      else if (next === 'groups') navigate('/groups');
      else if (next === 'messages') {
        requestChatNotificationPermission();
        navigate('/chat');
      } else if (next === 'profile') navigate('/profile');
    },
    [navigate],
  );

  const handleRetrySync = useCallback(() => {
    reloadFromServer();
  }, [reloadFromServer]);

  const showBootstrap =
    supabaseConfigured &&
    !onLoginRoute &&
    !skipDataWait &&
    !dataReady &&
    (authLoading || !!user);

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
      <Box id={FAB_OVERLAY_ROOT_ID} />
      <Box
        sx={{
          flexGrow: 1,
          height: APP_SHELL_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '--evenly-tab-bar-offset': showTabBar ? `${APP_TAB_BAR_HEIGHT_PX}px` : '0px',
        }}
      >
        {hideAppBar ? null : (
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
              component={RouterLink}
              to="/"
              aria-label="Evenly home"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'primary.main',
                minWidth: 0,
                '&:hover': { opacity: 0.92 },
              }}
            >
              <EvenlyHeaderLockup />
            </Box>
            {showHeaderTabs ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 1.5, minWidth: 0 }}>
                <Button
                  color={currentTab === 'home' ? 'primary' : 'inherit'}
                  onClick={() => goTab('home')}
                  size="small"
                  sx={{ fontWeight: currentTab === 'home' ? 700 : 500, minWidth: 0, px: 1 }}
                >
                  Home
                </Button>
                <Button
                  color={currentTab === 'search' ? 'primary' : 'inherit'}
                  onClick={() => goTab('search')}
                  size="small"
                  sx={{ fontWeight: currentTab === 'search' ? 700 : 500, minWidth: 0, px: 1 }}
                  aria-label={
                    pendingFriendRequests > 0
                      ? `Search, ${pendingFriendRequests} friend requests`
                      : 'Search'
                  }
                >
                  <Badge
                    color="warning"
                    badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
                    max={99}
                    invisible={pendingFriendRequests === 0}
                  >
                    Search
                  </Badge>
                </Button>
                <Button
                  color={currentTab === 'groups' ? 'primary' : 'inherit'}
                  onClick={() => goTab('groups')}
                  size="small"
                  sx={{ fontWeight: currentTab === 'groups' ? 700 : 500, minWidth: 0, px: 1 }}
                >
                  Groups
                </Button>
                <Button
                  color={currentTab === 'messages' ? 'primary' : 'inherit'}
                  onClick={() => goTab('messages')}
                  size="small"
                  sx={{ fontWeight: currentTab === 'messages' ? 700 : 500, minWidth: 0, px: 1 }}
                  aria-label={unreadChats > 0 ? `Messages, ${unreadChats} unread` : 'Messages'}
                >
                  <Badge
                    color="primary"
                    badgeContent={unreadChats > 0 ? unreadChats : 0}
                    max={99}
                    invisible={unreadChats === 0}
                  >
                    Messages
                  </Badge>
                </Button>
                <Button
                  color={currentTab === 'profile' ? 'primary' : 'inherit'}
                  onClick={() => goTab('profile')}
                  size="small"
                  sx={{ fontWeight: currentTab === 'profile' ? 700 : 500, minWidth: 0, px: 1 }}
                >
                  Profile
                </Button>
              </Box>
            ) : null}
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
                {showTabBar || showHeaderTabs ? null : (
                <>
                <IconButton
                  color="inherit"
                  aria-label={unreadChats > 0 ? `Chat, ${unreadChats} unread` : 'Chat'}
                  onClick={() => {
                    requestChatNotificationPermission();
                    navigate('/chat');
                  }}
                >
                  <Badge
                    color="primary"
                    badgeContent={unreadChats > 0 ? unreadChats : 0}
                    max={99}
                    invisible={unreadChats === 0}
                  >
                    <ChatBubbleOutlineIcon />
                  </Badge>
                </IconButton>
                <IconButton
                  color="inherit"
                  aria-label={
                    pendingFriendRequests > 0
                      ? `Friends, ${pendingFriendRequests} pending requests`
                      : 'Friends'
                  }
                  onClick={() => navigate('/friends')}
                >
                  <Badge
                    color="warning"
                    badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
                    max={99}
                    invisible={pendingFriendRequests === 0}
                  >
                    <PeopleIcon />
                  </Badge>
                </IconButton>
                </>
                )}
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
                      requestChatNotificationPermission();
                      navigate('/chat');
                    }}
                    selected={location.pathname === '/chat' || location.pathname.startsWith('/chat/')}
                    aria-label={unreadChats > 0 ? `Chat, ${unreadChats} unread` : 'Chat'}
                  >
                    <ListItemIcon>
                      <Badge
                        color="primary"
                        badgeContent={unreadChats > 0 ? unreadChats : 0}
                        max={99}
                        invisible={unreadChats === 0}
                      >
                        <ChatBubbleOutlineIcon fontSize="small" />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText primary="Messages" />
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
                  <MenuItem
                    onClick={() => {
                      setAccountAnchor(null);
                      navigate('/search');
                    }}
                    selected={location.pathname === '/search'}
                  >
                    <ListItemIcon>
                      <SearchIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Search" />
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
        )}

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {supabaseConfigured && user && syncError && !onLoginRoute ? (
            <Alert
              severity="error"
              onClose={clearSyncError}
              action={
                <Button color="inherit" size="small" onClick={handleRetrySync}>
                  Retry
                </Button>
              }
              sx={{ borderRadius: 0 }}
            >
              {syncError}
            </Alert>
          ) : null}
          {usesPullToRefreshLayout ? (
            <PullToRefreshLayout
              onRefresh={handlePullRefresh}
              disabled={pullToRefreshDisabledForRoute}
              fill={!showAppLegalFooter}
            >
              <AppMainColumn showFooter={showAppLegalFooter} />
            </PullToRefreshLayout>
          ) : (
            <Box
              id="evenly-main-scroll"
              sx={
                showAppLegalFooter
                  ? pullToRefreshScrollSx
                  : {
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }
              }
            >
              <AppMainColumn showFooter={showAppLegalFooter} />
            </Box>
          )}
        </Box>
        <CookieNotice />
        {showTabBar ? (
          <AppTabBar
            value={currentTab}
            onChange={goTab}
            unreadChats={unreadChats}
            pendingFriendRequests={pendingFriendRequests}
          />
        ) : null}
        <Snackbar
          open={Boolean(friendSnack)}
          autoHideDuration={6000}
          onClose={() => setFriendSnack('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          message={friendSnack}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setFriendSnack('');
                navigate('/friends');
              }}
            >
              View
            </Button>
          }
          sx={{ mt: 7 }}
        />
        <Snackbar
          open={Boolean(chatSnack)}
          autoHideDuration={5000}
          onClose={() => setChatSnack(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          message={chatSnack?.text || ''}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                const to = chatSnack?.to;
                setChatSnack(null);
                if (to) navigate(to);
              }}
            >
              Open
            </Button>
          }
          sx={{ mt: 7 }}
        />
      </Box>
    </ThemeProvider>
  );
}
