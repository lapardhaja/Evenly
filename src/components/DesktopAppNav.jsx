import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import { APP_TABS } from '../lib/appShell.js';

function tabAriaLabel(tab, { unreadChats, pendingFriendRequests }) {
  if (tab.id === 'search' && pendingFriendRequests > 0) {
    return `Search, ${pendingFriendRequests} friend requests`;
  }
  if (tab.id === 'messages' && unreadChats > 0) {
    return `Messages, ${unreadChats} unread`;
  }
  return tab.label;
}

function tabBadge(tab, { unreadChats, pendingFriendRequests }) {
  if (tab.id === 'search' && pendingFriendRequests > 0) {
    return { color: 'warning', count: pendingFriendRequests };
  }
  if (tab.id === 'messages' && unreadChats > 0) {
    return { color: 'primary', count: unreadChats };
  }
  return null;
}

export default function DesktopAppNav({
  value,
  onChange,
  unreadChats = 0,
  pendingFriendRequests = 0,
}) {
  const counts = { unreadChats, pendingFriendRequests };
  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        px: 0.5,
        py: 0.5,
        borderRadius: 999,
        bgcolor: 'action.hover',
      }}
    >
      {APP_TABS.map((tab) => {
        const selected = value === tab.id;
        const badge = tabBadge(tab, counts);
        const label = tabAriaLabel(tab, counts);
        const inner = (
          <Button
            color={selected ? 'primary' : 'inherit'}
            onClick={() => onChange(tab.id)}
            size="small"
            aria-label={label}
            aria-current={selected ? 'page' : undefined}
            sx={{
              minWidth: 0,
              px: { md: 1.25, lg: 1.5 },
              py: 0.75,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: selected ? 700 : 600,
              bgcolor: selected ? 'background.paper' : 'transparent',
              boxShadow: selected ? 1 : 0,
              '&:hover': {
                bgcolor: selected ? 'background.paper' : 'action.selected',
              },
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                fontSize: '1.15rem',
                lineHeight: 1,
                fontFamily:
                  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
              }}
            >
              {tab.emoji}
            </Box>
            <Box
              component="span"
              sx={{
                display: { xs: 'none', md: 'inline' },
                ml: 0.75,
                letterSpacing: 0.1,
              }}
            >
              {tab.label}
            </Box>
          </Button>
        );
        return (
          <Tooltip key={tab.id} title={tab.label} enterDelay={500}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              {badge ? (
                <Badge color={badge.color} badgeContent={badge.count} max={99} overlap="circular">
                  {inner}
                </Badge>
              ) : (
                inner
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
