import { useState, useCallback, useMemo, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const emptyState = {
  open: false,
  title: 'Are you sure?',
  message: '',
  confirmText: 'OK',
  destructive: false,
};

/**
 * Promise-based confirm dialog (works reliably in PWAs; avoids window.confirm).
 */
export function useConfirmDialog() {
  const [state, setState] = useState(emptyState);
  const resolveRef = useRef(null);

  const ask = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: opts.title ?? 'Are you sure?',
        message: opts.message ?? '',
        confirmText: opts.confirmText ?? 'OK',
        destructive: !!opts.destructive,
      });
    });
  }, []);

  const finish = useCallback((confirmed) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(confirmed);
    setState(emptyState);
  }, []);

  const confirmDialog = useMemo(
    () => (
      <Dialog
        open={state.open}
        onClose={() => finish(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">{state.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {state.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => finish(false)}>Cancel</Button>
          <Button
            onClick={() => finish(true)}
            color={state.destructive ? 'error' : 'primary'}
            variant="contained"
            autoFocus
          >
            {state.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    ),
    [state.open, state.title, state.message, state.confirmText, state.destructive, finish],
  );

  return { ask, confirmDialog };
}
