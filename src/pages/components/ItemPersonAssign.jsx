import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

/**
 * Checkbox (qty 1) or stepper (qty > 1) for one person on one item.
 */
export default function ItemPersonAssign({
  quantity,
  personQty,
  isFull,
  locked,
  onSetQty,
}) {
  if (quantity > 1) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <IconButton
          size="small"
          disabled={personQty <= 0 || locked}
          onClick={() => onSetQty(personQty - 1)}
          sx={{ p: 0.25 }}
          aria-label="Decrease share"
        >
          <RemoveIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            bgcolor: personQty > 0 ? 'primary.main' : 'transparent',
            color: personQty > 0 ? 'primary.contrastText' : 'text.disabled',
            border: personQty <= 0 ? '2px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {personQty > 0 ? personQty : ''}
        </Box>
        <IconButton
          size="small"
          disabled={isFull || locked}
          onClick={() => onSetQty(personQty + 1)}
          sx={{ p: 0.25 }}
          aria-label="Increase share"
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Checkbox
      checked={personQty > 0}
      onChange={(e) => onSetQty(e.target.checked ? 1 : 0)}
      disabled={locked}
      sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 24 } }}
    />
  );
}
