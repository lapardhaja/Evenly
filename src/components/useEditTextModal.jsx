import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import {
  sanitizeDecimalString,
  sanitizeIntegerString,
} from '../lib/numericInput.js';

/** @typedef {'text' | 'decimal' | 'integer'} EditInputKind */

export default function useEditTextModal() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    value: '',
    setValue: () => {},
    inputKind: 'text',
  });
  const [inputValue, setInputValue] = useState('');

  const showEditTextModal = useCallback(
    /** @param {{ title: string, value: string, setValue: (v: string) => void, inputKind?: EditInputKind }} opts */
    ({ title, value, setValue, inputKind = 'text' }) => {
      setConfig({ title, value, setValue, inputKind });
      setInputValue(value);
      setOpen(true);
    },
    [],
  );

  const handleSave = () => {
    config.setValue(inputValue);
    setOpen(false);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (config.inputKind === 'decimal') {
      setInputValue(sanitizeDecimalString(raw));
    } else if (config.inputKind === 'integer') {
      setInputValue(sanitizeIntegerString(raw));
    } else {
      setInputValue(raw);
    }
  };

  const inputMode =
    config.inputKind === 'decimal'
      ? 'decimal'
      : config.inputKind === 'integer'
        ? 'numeric'
        : 'text';

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
          onChange={handleChange}
          inputMode={inputMode}
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
