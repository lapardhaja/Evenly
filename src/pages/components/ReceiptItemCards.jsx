import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import { nameToInitials } from '../../functions/utils.js';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../../lib/currencies.js';
import { itemHighlightNeeded } from '../../lib/itemAssignLayout.js';
import ItemPersonAssign from './ItemPersonAssign.jsx';

export default function ReceiptItemCards({
  items,
  people,
  receipt,
  getPersonCountForItem,
  getItemQuantityForPerson,
  setPersonItemQuantity,
  assignAllPeopleToItem,
  isEveryoneAssignedToItem,
  updateReceiptItemValue,
  removeItem,
  showEditTextModal,
  ask,
}) {
  const theme = useTheme();
  const locked = !!receipt.locked;
  const code = normalizeCurrencyCode(receipt.currencyCode || 'USD');

  if (items.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
        <Typography color="text.secondary">No items yet. Tap + to add one.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {items.map((item) => {
        const assigned = getPersonCountForItem(item.id);
        const isFull = assigned >= item.quantity;
        const qtyIsOne = Math.floor(Number(item.quantity) || 0) === 1;
        const everyoneOnItem = qtyIsOne && isEveryoneAssignedToItem(item.id);
        const highlight = itemHighlightNeeded({ assigned, quantity: item.quantity });

        return (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: 1.5,
              bgcolor: highlight ? theme.palette.highlightedRowBg : undefined,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ButtonBase
                  onClick={() =>
                    !locked &&
                    showEditTextModal({
                      setValue: (v) => updateReceiptItemValue(item.id, 'name', v),
                      title: 'Edit Item Name',
                      value: item.name,
                    })
                  }
                  disabled={locked}
                  sx={{ borderRadius: 1, display: 'block', textAlign: 'left', maxWidth: '100%' }}
                >
                  <Typography fontWeight={700} noWrap>
                    {item.name}
                  </Typography>
                </ButtonBase>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                  <ButtonBase
                    onClick={() =>
                      !locked &&
                      showEditTextModal({
                        setValue: (v) => updateReceiptItemValue(item.id, 'quantity', v),
                        title: 'Edit Quantity',
                        value: String(item.quantity),
                        inputKind: 'integer',
                      })
                    }
                    disabled={locked}
                    sx={{ borderRadius: 1, px: 0.25 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Qty {item.quantity}
                    </Typography>
                  </ButtonBase>
                  <ButtonBase
                    onClick={() =>
                      !locked &&
                      showEditTextModal({
                        setValue: (v) => updateReceiptItemValue(item.id, 'cost', v),
                        title: 'Edit total cost',
                        value: String(item.cost),
                        inputKind: 'decimal',
                      })
                    }
                    disabled={locked}
                    sx={{ borderRadius: 1, px: 0.25 }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {formatMoneyWithCode(item.cost, code)}
                    </Typography>
                  </ButtonBase>
                </Box>
              </Box>
              {!locked && (
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Remove ${item.name}`}
                  onClick={async () => {
                    const ok = await ask({
                      title: 'Remove item?',
                      message: 'This line will be removed from the receipt.',
                      confirmText: 'Remove',
                      destructive: true,
                    });
                    if (ok) removeItem(item.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25, mb: 0.5 }}>
              <Chip
                size="small"
                label="All"
                color={everyoneOnItem ? 'primary' : 'default'}
                variant={everyoneOnItem ? 'filled' : 'outlined'}
                disabled={!qtyIsOne || locked || people.length === 0}
                onClick={() =>
                  qtyIsOne && !locked && people.length > 0 && assignAllPeopleToItem(item.id)
                }
                sx={{ height: 24, fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary">
                {assigned}/{item.quantity} assigned
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {people.map((person) => {
                const personQty = getItemQuantityForPerson(person.id, item.id);
                return (
                  <Box
                    key={person.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: personQty > 0 ? 'primary.main' : 'divider',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.65rem',
                        bgcolor: personQty > 0 ? 'primary.main' : 'action.disabledBackground',
                      }}
                    >
                      {nameToInitials(person.name)}
                    </Avatar>
                    <Typography variant="caption" fontWeight={600} sx={{ maxWidth: 72 }} noWrap>
                      {person.name}
                    </Typography>
                    <ItemPersonAssign
                      quantity={item.quantity}
                      personQty={personQty}
                      isFull={isFull}
                      locked={locked}
                      onSetQty={(qty) => setPersonItemQuantity(person.id, item.id, qty)}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
