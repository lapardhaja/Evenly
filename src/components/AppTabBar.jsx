import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Badge from '@mui/material/Badge';
import HomeIcon from '@mui/icons-material/Home';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleIcon from '@mui/icons-material/People';
import { APP_TAB_BAR_HEIGHT_PX } from '../lib/appShell.js';

export default function AppTabBar({
  value,
  onChange,
  showChat = false,
  unreadChats = 0,
  pendingFriendRequests = 0,
}) {
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
        showLabels
        value={value || false}
        onChange={(_, next) => onChange(next)}
        sx={{ height: APP_TAB_BAR_HEIGHT_PX }}
      >
        <BottomNavigationAction value="home" label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction value="groups" label="Groups" icon={<FolderSharedIcon />} />
        {showChat ? (
          <BottomNavigationAction
            value="chat"
            label="Chat"
            icon={
              <Badge
                color="primary"
                badgeContent={unreadChats > 0 ? unreadChats : 0}
                max={99}
                invisible={unreadChats === 0}
              >
                <ChatBubbleOutlineIcon />
              </Badge>
            }
          />
        ) : null}
        {showChat ? (
          <BottomNavigationAction
            value="friends"
            label="Friends"
            icon={
              <Badge
                color="warning"
                badgeContent={pendingFriendRequests > 0 ? pendingFriendRequests : 0}
                max={99}
                invisible={pendingFriendRequests === 0}
              >
                <PeopleIcon />
              </Badge>
            }
          />
        ) : null}
      </BottomNavigation>
    </Paper>
  );
}
