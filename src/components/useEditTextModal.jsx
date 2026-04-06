import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

export default function useEditTextModal() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({ title: '', value: '', setValue: () => {} });
  const [inputValue, setInputValue] = useState('');

  const showEditTextModal = useCallback(({ title, value, setValue }) => {
    setConfig({ title, value, setValue });
    setInputValue(value);
    setOpen(true);
  }, []);

  const handleSave = () => {
    config.setValue(inputValue);
    setOpen(false);
  };

  const EditTextModal = (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      disableAutoFocus
    >
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="dense"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          variant="outlined"
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { EditTextModal, showEditTextModal };
}
