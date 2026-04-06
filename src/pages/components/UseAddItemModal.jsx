import { useState, useRef, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';

export default function useAddItemModal({ onAddItem }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [quantity, setQuantity] = useState('1');
  const nameRef = useRef(null);

  const showAddItemModal = useCallback(() => {
    setName('');
    setCost('');
    setQuantity('1');
    setOpen(true);
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !cost) return;
    onAddItem({
      name: name.trim(),
      cost: parseFloat(cost) || 0,
      quantity: parseInt(quantity, 10) || 1,
    });
    setName('');
    setCost('');
    setQuantity('1');
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const AddItemModal = (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Add Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            inputRef={nameRef}
            autoFocus
            label="Item Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('add-item-cost')?.focus();
              }
            }}
            size="small"
          />
          <TextField
            id="add-item-cost"
            label="Total cost ($)"
            type="number"
            fullWidth
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            inputProps={{ step: '0.01', min: '0' }}
            size="small"
          />
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            inputProps={{ min: '1' }}
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!name.trim() || !cost}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { AddItemModal, showAddItemModal };
}
