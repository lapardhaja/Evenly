import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Link as RouterLink } from 'react-router-dom';
import { dismissCookieNotice, hasDismissedCookieNotice } from '../lib/cookieNotice.js';

const COOKIE_BANNER_OFFSET_VAR = '--evenly-cookie-banner-offset';

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => !hasDismissedCookieNotice());
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.style.setProperty(
      COOKIE_BANNER_OFFSET_VAR,
      visible ? '8rem' : '0px',
    );
    return () => {
      document.documentElement.style.setProperty(COOKIE_BANNER_OFFSET_VAR, '0px');
    };
  }, [visible]);

  if (!visible) return null;

  const handleAccept = () => {
    dismissCookieNotice();
    setManageOpen(false);
    setVisible(false);
  };

  return (
    <>
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
            We use strictly necessary cookies and similar technologies (including localStorage) to
            run Evenly, keep you signed in, and remember preferences. We do not use advertising or
            analytics cookies. See our{' '}
            <Link component={RouterLink} to="/cookies" underline="hover">
              Cookie Policy
            </Link>
            .
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={() => setManageOpen(true)}>
              Cookie settings
            </Button>
            <Button variant="contained" size="small" onClick={handleAccept}>
              Accept
            </Button>
          </Box>
        </Box>
      </Paper>
      <Dialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        aria-labelledby="cookie-settings-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="cookie-settings-title">Cookie settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Evenly only uses <strong>strictly necessary</strong> storage. There are no advertising,
            marketing, or analytics cookies to turn off. Disabling all site data in your browser
            will sign you out and, in local-only mode, delete groups stored only on this device.
          </Typography>
          <Typography variant="body2" paragraph>
            Categories in use: authentication session, theme preference, cookie-notice
            acknowledgement, optional remembered sign-in identifier, PWA caches, and — if you
            enable them — Web Push subscriptions. Full table:{' '}
            <Link component={RouterLink} to="/cookies" underline="hover" onClick={() => setManageOpen(false)}>
              Cookie Policy
            </Link>
            .
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleAccept}>
            Accept essential storage
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
