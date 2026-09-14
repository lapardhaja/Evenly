import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { APP_TABS } from '../lib/appShell.js';
import AppTabIcon, { appTabAriaLabel, appTabBadge } from './AppTabIcon.jsx';

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
        flexShrink: 0,
        width: { md: 200, lg: 220 },
        height: '100%',
        overflow: 'auto',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: 1,
        px: 1,
      }}
    >
      <List disablePadding dense>
        {APP_TABS.map((tab) => {
          const selected = value === tab.id;
          const badge = appTabBadge(tab, counts);
          const icon = <AppTabIcon id={tab.id} selected={selected} />;
          return (
            <ListItemButton
              key={tab.id}
              selected={selected}
              onClick={() => onChange(tab.id)}
              aria-label={appTabAriaLabel(tab, counts)}
              aria-current={selected ? 'page' : undefined}
              sx={{
                mb: 0.25,
                borderRadius: 1.5,
                py: 1,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'action.selected' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                {badge ? (
                  <Badge color={badge.color} badgeContent={badge.count} max={99} overlap="circular">
                    {icon}
                  </Badge>
                ) : (
                  icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={tab.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: selected ? 700 : 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
