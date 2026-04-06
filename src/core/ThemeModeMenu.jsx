import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: LightModeIcon, hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: DarkModeIcon, hint: 'Always dark' },
  { value: 'system', label: 'Auto', icon: BrightnessAutoIcon, hint: 'Match device' },
];

export default function ThemeModeMenu({ themeMode, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);

  const CurrentIcon =
    OPTIONS.find((o) => o.value === themeMode)?.icon ?? BrightnessAutoIcon;

  return (
    <>
      <Tooltip title="Appearance (light / dark)">
        <IconButton
          color="inherit"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Choose light or dark mode"
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          edge="end"
          sx={{ ml: 'auto' }}
        >
          <CurrentIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {OPTIONS.map(({ value, label, icon: Icon, hint }) => (
          <MenuItem
            key={value}
            selected={themeMode === value}
            onClick={() => {
              onChange(value);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} secondary={hint} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
