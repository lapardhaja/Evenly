import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Badge from '@mui/material/Badge';
import { APP_TAB_BAR_HEIGHT_PX, APP_TABS } from '../lib/appShell.js';
import AppTabIcon, { appTabAriaLabel, appTabBadge } from './AppTabIcon.jsx';

export default function AppTabBar({
  value,
  onChange,
  unreadChats = 0,
  pendingFriendRequests = 0,
}) {
  const selected = value || false;
  const counts = { unreadChats, pendingFriendRequests };
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
        {APP_TABS.map((tab) => {
          const badge = appTabBadge(tab, counts);
          const icon = <AppTabIcon id={tab.id} selected={selected === tab.id} />;
          return (
            <BottomNavigationAction
              key={tab.id}
              value={tab.id}
              aria-label={appTabAriaLabel(tab, counts)}
              icon={
                badge ? (
                  <Badge color={badge.color} badgeContent={badge.count} max={99} overlap="circular">
                    {icon}
                  </Badge>
                ) : (
                  icon
                )
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
