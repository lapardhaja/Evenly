import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import currency from 'currency.js';
import { appliedDiscountAmount } from '../../functions/receiptTotals.js';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../../lib/currencies.js';

export default function ReceiptChargeSummary({
  receipt,
  subTotal,
  taxableBaseAfterDiscount,
  total,
  taxPct,
  tipPct,
  taxInclusive,
  locked,
  updateChargeValue,
  updateChargeValueByPct,
  showEditTextModal,
}) {
  const code = normalizeCurrencyCode(receipt.currencyCode || 'USD');
  const disc = appliedDiscountAmount(subTotal, receipt.discountCost);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, mt: 2, overflow: 'hidden' }}>
      <List disablePadding>
        <ListItem>
          <ListItemText primary={<Typography fontWeight={700}>Sub Total</Typography>} />
          <Typography fontWeight={700}>{formatMoneyWithCode(subTotal, code)}</Typography>
        </ListItem>
        <ListItem>
          <ListItemText primary="Discount" />
          <ButtonBase
            disabled={locked}
            onClick={() =>
              !locked &&
              showEditTextModal({
                setValue: (v) => updateChargeValue('discountCost', v),
                title: 'Edit discount',
                value: String(receipt.discountCost ?? 0),
                inputKind: 'decimal',
              })
            }
            sx={{ borderRadius: 1, px: 0.5 }}
          >
            <Typography color={disc > 0 ? 'success.main' : 'text.secondary'}>
              {disc > 0 ? `−${currency(disc).format()}` : currency(0).format()}
            </Typography>
          </ButtonBase>
        </ListItem>
        {disc > 0 && (
          <ListItem>
            <ListItemText
              primary="After discount"
              secondary="Tax & tip use this"
            />
            <Typography fontWeight={600}>{formatMoneyWithCode(taxableBaseAfterDiscount, code)}</Typography>
          </ListItem>
        )}
        <ListItem>
          <ListItemText
            primary="Tax"
            secondary={taxInclusive ? 'Included in prices' : null}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!taxInclusive && (
              <ButtonBase
                disabled={locked}
                onClick={() =>
                  !locked &&
                  showEditTextModal({
                    setValue: (v) =>
                      updateChargeValueByPct('taxCost', v, taxableBaseAfterDiscount),
                    title: 'Edit Tax %',
                    value: taxPct === '—' ? '0' : taxPct,
                    inputKind: 'decimal',
                  })
                }
                sx={{ borderRadius: 1, px: 0.5 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {taxPct}%
                </Typography>
              </ButtonBase>
            )}
            <ButtonBase
              disabled={locked}
              onClick={() =>
                !locked &&
                showEditTextModal({
                  setValue: (v) => updateChargeValue('taxCost', v),
                  title: 'Edit Tax',
                  value: String(receipt.taxCost),
                  inputKind: 'decimal',
                })
              }
              sx={{ borderRadius: 1, px: 0.5 }}
            >
              <Typography>{formatMoneyWithCode(receipt.taxCost, code)}</Typography>
            </ButtonBase>
          </Box>
        </ListItem>
        <ListItem>
          <ListItemText primary="Tip" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonBase
              disabled={locked}
              onClick={() =>
                !locked &&
                showEditTextModal({
                  setValue: (v) =>
                    updateChargeValueByPct('tipCost', v, taxableBaseAfterDiscount),
                  title: 'Edit Tip %',
                  value: tipPct,
                  inputKind: 'decimal',
                })
              }
              sx={{ borderRadius: 1, px: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {tipPct}%
              </Typography>
            </ButtonBase>
            <ButtonBase
              disabled={locked}
              onClick={() =>
                !locked &&
                showEditTextModal({
                  setValue: (v) => updateChargeValue('tipCost', v),
                  title: 'Edit Tip',
                  value: String(receipt.tipCost),
                  inputKind: 'decimal',
                })
              }
              sx={{ borderRadius: 1, px: 0.5 }}
            >
              <Typography>{currency(receipt.tipCost).format()}</Typography>
            </ButtonBase>
          </Box>
        </ListItem>
        <ListItem>
          <ListItemText primary={<Typography fontWeight={700}>Total</Typography>} />
          <Typography fontWeight={700}>{formatMoneyWithCode(total, code)}</Typography>
        </ListItem>
      </List>
    </Paper>
  );
}
