import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
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
        flexDirection: 'column',
        alignItems: 'stretch',
        flexShrink: 0,
        width: { md: 212, lg: 240 },
        height: '100%',
        overflow: 'auto',
        px: 1.25,
        py: 1.5,
        gap: 0.5,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {APP_TABS.map((tab) => {
        const selected = value === tab.id;
        const badge = tabBadge(tab, counts);
        const label = tabAriaLabel(tab, counts);
        const emoji = (
          <Box
            component="span"
            aria-hidden
            sx={{
              fontSize: '1.25rem',
              lineHeight: 1,
              width: 28,
              textAlign: 'center',
              fontFamily:
                '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
            }}
          >
            {tab.emoji}
          </Box>
        );
        return (
          <Button
            key={tab.id}
            color={selected ? 'primary' : 'inherit'}
            onClick={() => onChange(tab.id)}
            aria-label={label}
            aria-current={selected ? 'page' : undefined}
            sx={{
              minWidth: 0,
              justifyContent: 'flex-start',
              px: 1.5,
              py: 1.1,
              gap: 1.25,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: selected ? 700 : 600,
              fontSize: '0.95rem',
              bgcolor: selected ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: selected ? 'action.selected' : 'action.hover',
              },
            }}
          >
            {badge ? (
              <Badge color={badge.color} badgeContent={badge.count} max={99} overlap="circular">
                {emoji}
              </Badge>
            ) : (
              emoji
            )}
            <Box component="span" sx={{ letterSpacing: 0.1 }}>
              {tab.label}
            </Box>
          </Button>
        );
      })}
    </Box>
  );
}
