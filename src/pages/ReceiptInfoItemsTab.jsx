import { useState } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Fab from '@mui/material/Fab';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListItem from '@mui/material/ListItem';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import currency from 'currency.js';
import { nameToInitials } from '../functions/utils.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import useAddItemModal from './components/UseAddItemModal.jsx';

export default function ReceiptInfoItemsTab({ receiptData }) {
  const {
    receipt,
    items,
    people,
    subTotal,
    total,
    getPersonCountForItem,
    getItemQuantityForPerson,
    setPersonItemQuantity,
    updateReceiptItemValue,
    addItem,
    removeItem,
    updateChargeValue,
    updateChargeValueByPct,
  } = receiptData;

  const theme = useTheme();
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const { AddItemModal, showAddItemModal } = useAddItemModal({
    onAddItem: addItem,
  });

  const taxPct = subTotal > 0
    ? ((currency(receipt.taxCost).value / currency(subTotal).value) * 100).toFixed(2)
    : '0.00';
  const tipPct = subTotal > 0
    ? ((currency(receipt.tipCost).value / currency(subTotal).value) * 100).toFixed(2)
    : '0.00';

  return (
    <Box>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 400,
            '& td, & th': {
              whiteSpace: 'nowrap',
              py: 1,
              px: 1.5,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  bgcolor: 'background.paper',
                  fontWeight: 700,
                }}
              >
                Item
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Cost</TableCell>
              {people.map((person) => (
                <TableCell
                  key={person.id}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {person.name}
                </TableCell>
              ))}
              {!receipt.locked && <TableCell sx={{ width: 40 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3 + people.length + (!receipt.locked ? 1 : 0)} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No items yet. Tap + to add one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const assigned = getPersonCountForItem(item.id);
                const isFull = assigned >= item.quantity;
                const highlightBg = !isFull
                  ? theme.palette.highlightedRowBg
                  : undefined;

                return (
                  <TableRow key={item.id} sx={{ bgcolor: highlightBg }}>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        bgcolor: highlightBg || 'background.paper',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: receipt.locked ? 'default' : 'pointer',
                      }}
                    >
                      <ButtonBase
                        onClick={() =>
                          !receipt.locked &&
                          showEditTextModal({
                            setValue: (v) => updateReceiptItemValue(item.id, 'name', v),
                            title: 'Edit Item Name',
                            value: item.name,
                          })
                        }
                        disabled={receipt.locked}
                        sx={{ borderRadius: 1, px: 0.5 }}
                      >
                        {item.name}
                      </ButtonBase>
                    </TableCell>
                    <TableCell align="center">
                      <ButtonBase
                        onClick={() =>
                          !receipt.locked &&
                          showEditTextModal({
                            setValue: (v) => updateReceiptItemValue(item.id, 'quantity', v),
                            title: 'Edit Quantity',
                            value: String(item.quantity),
                          })
                        }
                        disabled={receipt.locked}
                        sx={{ borderRadius: 1, px: 0.5 }}
                      >
                        {item.quantity}
                      </ButtonBase>
                    </TableCell>
                    <TableCell align="right">
                      <ButtonBase
                        onClick={() =>
                          !receipt.locked &&
                          showEditTextModal({
                            setValue: (v) => updateReceiptItemValue(item.id, 'cost', v),
                            title: 'Edit Cost',
                            value: String(item.cost),
                          })
                        }
                        disabled={receipt.locked}
                        sx={{ borderRadius: 1, px: 0.5 }}
                      >
                        {currency(item.cost).format()}
                      </ButtonBase>
                    </TableCell>
                    {people.map((person) => {
                      const personQty = getItemQuantityForPerson(person.id, item.id);
                      return (
                        <TableCell key={person.id} align="center">
                          {item.quantity > 1 ? (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.25,
                              }}
                            >
                              <IconButton
                                size="small"
                                disabled={personQty <= 0 || receipt.locked}
                                onClick={() =>
                                  setPersonItemQuantity(person.id, item.id, personQty - 1)
                                }
                                sx={{ p: 0.25 }}
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
                                  bgcolor: personQty > 0
                                    ? 'primary.main'
                                    : 'transparent',
                                  color: personQty > 0
                                    ? 'primary.contrastText'
                                    : 'text.disabled',
                                  border: personQty <= 0
                                    ? '2px solid'
                                    : 'none',
                                  borderColor: 'divider',
                                }}
                              >
                                {personQty > 0 ? personQty : ''}
                              </Box>
                              <IconButton
                                size="small"
                                disabled={isFull || receipt.locked}
                                onClick={() =>
                                  setPersonItemQuantity(person.id, item.id, personQty + 1)
                                }
                                sx={{ p: 0.25 }}
                              >
                                <AddIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          ) : (
                            <Checkbox
                              checked={personQty > 0}
                              onChange={(e) =>
                                setPersonItemQuantity(
                                  person.id,
                                  item.id,
                                  e.target.checked ? 1 : 0,
                                )
                              }
                              disabled={receipt.locked}
                              sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 24 } }}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                    {!receipt.locked && (
                      <TableCell sx={{ p: 0.5 }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('Remove this item?')) removeItem(item.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}

            {/* Spacer */}
            <TableRow>
              <TableCell
                colSpan={3 + people.length + (!receipt.locked ? 1 : 0)}
                sx={{ bgcolor: 'transparent', borderBottom: 'none', py: 0.5 }}
              />
            </TableRow>

            {/* Sub Total */}
            <TableRow>
              <TableCell sx={{ fontWeight: 700, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                Sub Total
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {currency(subTotal).format()}
              </TableCell>
              <TableCell colSpan={people.length + (!receipt.locked ? 1 : 0)} />
            </TableRow>

            {/* Tax */}
            <TableRow>
              <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                Tax
              </TableCell>
              <TableCell align="center">
                <ButtonBase
                  onClick={() =>
                    !receipt.locked &&
                    showEditTextModal({
                      setValue: (v) => updateChargeValueByPct('taxCost', v, subTotal),
                      title: 'Edit Tax %',
                      value: taxPct,
                    })
                  }
                  disabled={receipt.locked}
                  sx={{ borderRadius: 1, px: 0.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {taxPct}%
                  </Typography>
                </ButtonBase>
              </TableCell>
              <TableCell align="right">
                <ButtonBase
                  onClick={() =>
                    !receipt.locked &&
                    showEditTextModal({
                      setValue: (v) => updateChargeValue('taxCost', v),
                      title: 'Edit Tax',
                      value: String(receipt.taxCost),
                    })
                  }
                  disabled={receipt.locked}
                  sx={{ borderRadius: 1, px: 0.5 }}
                >
                  {currency(receipt.taxCost).format()}
                </ButtonBase>
              </TableCell>
              <TableCell colSpan={people.length + (!receipt.locked ? 1 : 0)} />
            </TableRow>

            {/* Tip */}
            <TableRow>
              <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                Tip
              </TableCell>
              <TableCell align="center">
                <ButtonBase
                  onClick={() =>
                    !receipt.locked &&
                    showEditTextModal({
                      setValue: (v) => updateChargeValueByPct('tipCost', v, subTotal),
                      title: 'Edit Tip %',
                      value: tipPct,
                    })
                  }
                  disabled={receipt.locked}
                  sx={{ borderRadius: 1, px: 0.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tipPct}%
                  </Typography>
                </ButtonBase>
              </TableCell>
              <TableCell align="right">
                <ButtonBase
                  onClick={() =>
                    !receipt.locked &&
                    showEditTextModal({
                      setValue: (v) => updateChargeValue('tipCost', v),
                      title: 'Edit Tip',
                      value: String(receipt.tipCost),
                    })
                  }
                  disabled={receipt.locked}
                  sx={{ borderRadius: 1, px: 0.5 }}
                >
                  {currency(receipt.tipCost).format()}
                </ButtonBase>
              </TableCell>
              <TableCell colSpan={people.length + (!receipt.locked ? 1 : 0)} />
            </TableRow>

            {/* Total */}
            <TableRow>
              <TableCell sx={{ fontWeight: 700, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                Total
              </TableCell>
              <TableCell />
              <TableCell align="right">
                <Typography fontWeight={700}>{currency(total).format()}</Typography>
              </TableCell>
              <TableCell colSpan={people.length + (!receipt.locked ? 1 : 0)} />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Per-person breakdown */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Per Person Breakdown
        </Typography>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {people.map((person, idx) => (
              <Box key={person.id}>
                {idx > 0 && <Divider />}
                <PersonTotalListItem person={person} receiptData={receiptData} />
              </Box>
            ))}
            {people.length === 0 && (
              <ListItem>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, width: '100%', textAlign: 'center' }}>
                  Add people in the People tab to see the breakdown.
                </Typography>
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>

      {!receipt.locked && (
        <Fab
          color="primary"
          onClick={showAddItemModal}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {EditTextModal}
      {AddItemModal}
    </Box>
  );
}

function PersonTotalListItem({ person, receiptData }) {
  const {
    receipt,
    items,
    personSubTotalMap,
    getItemQuantityForPerson,
    getItemCostForPerson,
    getChargeForPerson,
    getTotalForPerson,
    updatePerson,
  } = receiptData;

  const [open, setOpen] = useState(false);
  const personTotal = getTotalForPerson(person.id);
  const personSub = personSubTotalMap[person.id]?.subTotal || 0;

  const getVenmoLink = () => {
    const amount = personTotal;
    const note = encodeURIComponent(`${receipt.title} - Split by Evenly`);
    return `venmo://paycharge?txn=charge&recipients=&amount=${amount}&note=${note}`;
  };

  return (
    <>
      <ListItemButton onClick={() => setOpen(!open)} sx={{ py: 1.5 }}>
        <Checkbox
          checked={!!person.paid}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            updatePerson({ ...person, paid: !person.paid });
          }}
          sx={{ mr: 1 }}
        />
        <ListItemAvatar>
          <Avatar
            sx={{
              bgcolor: person.paid ? 'action.disabled' : 'primary.main',
              width: 36,
              height: 36,
              fontSize: '0.85rem',
            }}
          >
            {nameToInitials(person.name)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={person.name}
          secondary={
            person.paid ? (
              <Typography
                component="span"
                variant="body2"
                sx={{ color: 'success.main', fontWeight: 700 }}
              >
                PAID
              </Typography>
            ) : (
              <Typography
                component="span"
                variant="body2"
                fontWeight={600}
                color="primary"
              >
                {currency(personTotal).format()}
              </Typography>
            )
          }
        />
        {!person.paid && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = getVenmoLink();
            }}
            sx={{ mr: 1 }}
          >
            <Typography variant="caption" fontWeight={700} color="primary">
              Venmo
            </Typography>
          </IconButton>
        )}
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding dense sx={{ pl: 9, pr: 2, pb: 1 }}>
          {items
            .filter((item) => getItemQuantityForPerson(person.id, item.id) > 0)
            .map((item) => {
              const info = getItemCostForPerson(person.id, item.id);
              const showCount = info.totalShares > info.shares;
              return (
                <ListItem key={item.id} sx={{ py: 0.25, px: 0 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {item.name}
                        {showCount && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {` [${info.shares}/${info.totalShares}]`}
                          </Typography>
                        )}
                      </Typography>
                    }
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {currency(info.subTotal).format()}
                  </Typography>
                </ListItem>
              );
            })}
          <Divider sx={{ my: 0.5 }} />
          <ListItem sx={{ py: 0.25, px: 0 }}>
            <ListItemText primary={<Typography variant="body2">Sub Total</Typography>} />
            <Typography variant="body2">{currency(personSub).format()}</Typography>
          </ListItem>
          <ListItem sx={{ py: 0.25, px: 0 }}>
            <ListItemText primary={<Typography variant="body2">Tax</Typography>} />
            <Typography variant="body2">
              {currency(getChargeForPerson('taxCost', person.id)).format()}
            </Typography>
          </ListItem>
          <ListItem sx={{ py: 0.25, px: 0 }}>
            <ListItemText primary={<Typography variant="body2">Tip</Typography>} />
            <Typography variant="body2">
              {currency(getChargeForPerson('tipCost', person.id)).format()}
            </Typography>
          </ListItem>
        </List>
      </Collapse>
    </>
  );
}
