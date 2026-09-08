import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import { dismissCookieNotice, hasDismissedCookieNotice } from '../lib/cookieNotice.js';

const COOKIE_BANNER_OFFSET_VAR = '--evenly-cookie-banner-offset';

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => !hasDismissedCookieNotice());

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.style.setProperty(
      COOKIE_BANNER_OFFSET_VAR,
      visible ? '5.5rem' : '0px',
    );
    return () => {
      document.documentElement.style.setProperty(COOKIE_BANNER_OFFSET_VAR, '0px');
    };
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    dismissCookieNotice();
    setVisible(false);
  };

  return (
    <Paper
      component="aside"
      elevation={8}
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.snackbar,
        borderRadius: 0,
        bgcolor: 'background.paper',
        color: 'text.primary',
        px: 2,
        pt: 1.5,
        pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Box
        sx={{
          maxWidth: 960,
          mx: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 240px' }}>
          Evenly uses essential browser storage only (not advertising or analytics cookies). See
          our{' '}
          <Link component={RouterLink} to="/cookies" underline="hover">
            Cookie Policy
          </Link>
          .
        </Typography>
        <Button variant="contained" size="small" onClick={handleDismiss}>
          Got it
        </Button>
      </Box>
    </Paper>
  );
}
