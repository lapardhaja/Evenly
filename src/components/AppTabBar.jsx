import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Badge from '@mui/material/Badge';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import SendIcon from '@mui/icons-material/Send';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { APP_TAB_BAR_HEIGHT_PX } from '../lib/appShell.js';

export default function AppTabBar({
  value,
  onChange,
  showChat = false,
  unreadChats = 0,
  pendingFriendRequests = 0,
}) {
  const selected = value || false;
  return (
    <Paper
      component="nav"
      aria-label="Primary"
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--evenly-cookie-banner-offset, 0px)',
        zIndex: (t) => t.zIndex.appBar,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        pb: 'env(safe-area-inset-bottom, 0px)',
        bgcolor: 'background.paper',
      }}
    >
      <BottomNavigation
        showLabels={false}
        value={selected}
        onChange={(_, next) => onChange(next)}
        sx={{ height: APP_TAB_BAR_HEIGHT_PX }}
      >
        <BottomNavigationAction
          value="home"
          icon={selected === 'home' ? <HomeIcon /> : <HomeOutlinedIcon />}
          aria-label="Home"
        />
        <BottomNavigationAction
          value="search"
          aria-label={
            pendingFriendRequests > 0
              ? `Search, ${pendingFriendRequests} friend requests`
              : 'Search'
          }
          icon={
            <Badge
              color="warning"
              badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
              max={99}
              invisible={pendingFriendRequests === 0}
            >
              <SearchIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          value="groups"
          icon={selected === 'groups' ? <FolderSharedIcon /> : <FolderSharedOutlinedIcon />}
          aria-label="Groups"
        />
        {showChat ? (
          <BottomNavigationAction
            value="messages"
            aria-label={unreadChats > 0 ? `Messages, ${unreadChats} unread` : 'Messages'}
            icon={
              <Badge
                color="primary"
                badgeContent={unreadChats > 0 ? unreadChats : 0}
                max={99}
                invisible={unreadChats === 0}
              >
                {selected === 'messages' ? <SendIcon /> : <SendOutlinedIcon />}
              </Badge>
            }
          />
        ) : null}
        <BottomNavigationAction
          value="profile"
          icon={selected === 'profile' ? <PersonIcon /> : <PersonOutlineIcon />}
          aria-label="Profile"
        />
      </BottomNavigation>
    </Paper>
  );
}
