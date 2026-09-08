import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AttachmentLightbox, { canPreviewAttachmentInline } from '../components/AttachmentLightbox.jsx';
import { receiptGrandTotal } from '../functions/receiptTotals.js';
import { idMapToList, nameToInitials } from '../functions/utils.js';
import {
  conversionFactorFromUsdRates,
  formatMoneyWithCode,
  getUsdRatesTable,
  normalizeCurrencyCode,
} from '../lib/currencies.js';
import {
  fetchPublicAttachmentUrl,
  fetchPublicGroupShare,
  publicSharePayloadToGroup,
  publicShareTransfers,
} from '../lib/publicGroupShare.js';
import { listReceiptsCurrencyMeta, scaleGroupMoneyForDisplay } from '../lib/settlementCurrency.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function personName(peopleMap, id) {
  return peopleMap[id]?.name || 'Unknown';
}

function receiptSubtotal(receipt) {
  return idMapToList(receipt.items).reduce((s, i) => s + (Number(i.cost) || 0), 0);
}

function receiptTotal(receipt) {
  return receiptGrandTotal(
    receiptSubtotal(receipt),
    receipt.discountCost,
    receipt.taxCost,
    receipt.tipCost,
    receipt.taxBehavior,
  );
}

function sanitizeFileName(name) {
  const base = String(name || 'attachment').replace(/^.*[/\\]/, '');
  return base.replace(/[\u0000-\u001f]/g, '').trim() || 'attachment';
}

function SharedReceiptAttachments({ attachments, signedUrls, onOpen }) {
  if (!attachments?.length) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
      {attachments.map((row) => {
        const name = sanitizeFileName(row.file_name);
        const previewUrl = signedUrls[row.id];
        const inlineThumb = canPreviewAttachmentInline(row.mime_type);
        const isPdf = String(row.mime_type || '').toLowerCase() === 'application/pdf';
        return (
          <Box
            key={row.id}
            sx={{
              width: 80,
              height: 80,
              borderRadius: 1,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <ButtonBase
              onClick={() => onOpen(row)}
              aria-label={`Open ${name}`}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}
            >
              {inlineThumb && previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  alt={name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  {isPdf ? (
                    <PictureAsPdfIcon color="action" />
                  ) : (
                    <InsertDriveFileOutlinedIcon color="action" />
                  )}
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ maxWidth: '100%', mt: 0.25, px: 0.25 }}
                  >
                    {name}
                  </Typography>
                </>
              )}
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
}

export default function PublicGroupSharePage() {
  const { shareId } = useParams();
  const [status, setStatus] = useState('loading');
  const [payload, setPayload] = useState(null);
  const [receiptFactors, setReceiptFactors] = useState({});
  const [fxError, setFxError] = useState('');
  const [signedUrls, setSignedUrls] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const [attachError, setAttachError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPayload(null);
    if (!shareId || !isSupabaseConfigured()) {
      setStatus('error');
      return undefined;
    }
    (async () => {
      try {
        const data = await fetchPublicGroupShare(shareId);
        if (!cancelled) {
          setPayload(data);
          setStatus('ok');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const group = useMemo(
    () => (payload ? publicSharePayloadToGroup(payload) : null),
    [payload],
  );

  const peopleMap = useMemo(() => group?.people || {}, [group]);
  const receipts = useMemo(() => (group ? idMapToList(group.receipts) : []), [group]);
  const settleCode = normalizeCurrencyCode(group?.displayCurrency || 'USD');

  useEffect(() => {
    if (!group) {
      setReceiptFactors({});
      return undefined;
    }
    const meta = listReceiptsCurrencyMeta(group);
    if (meta.length === 0) {
      setReceiptFactors({});
      return undefined;
    }
    const allSame = meta.every((row) => normalizeCurrencyCode(row.currencyCode) === settleCode);
    if (allSame) {
      setReceiptFactors({});
      setFxError('');
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const factors = {};
      const failed = [];
      const rates = await getUsdRatesTable();
      if (cancelled) return;
      if (!rates) {
        for (const row of meta) {
          factors[row.id] = 1;
          failed.push(row.id);
        }
        setReceiptFactors(factors);
        setFxError('Couldn’t load exchange rates. Amounts may mix currencies.');
        return;
      }
      for (const row of meta) {
        const from = normalizeCurrencyCode(row.currencyCode);
        const rate = conversionFactorFromUsdRates(rates, from, settleCode);
        if (rate == null || !Number.isFinite(rate) || rate <= 0) {
          factors[row.id] = 1;
          failed.push(row.id);
        } else {
          factors[row.id] = rate;
        }
      }
      if (!cancelled) {
        setReceiptFactors(factors);
        setFxError(
          failed.length > 0
            ? 'Some amounts couldn’t be converted — shown in the receipt’s currency.'
            : '',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group, settleCode]);

  const scaledGroup = useMemo(
    () => (group ? scaleGroupMoneyForDisplay(group, receiptFactors) : null),
    [group, receiptFactors],
  );

  const transfers = useMemo(
    () => (scaledGroup ? publicShareTransfers(scaledGroup) : []),
    [scaledGroup],
  );

  const prefetchAttachments = useCallback(
    async (receipt) => {
      const list = receipt.attachments || [];
      if (!shareId || !list.length) return;
      await Promise.all(
        list.map(async (row) => {
          if (signedUrls[row.id]) return;
          try {
            const url = await fetchPublicAttachmentUrl(shareId, row.id);
            setSignedUrls((prev) => ({ ...prev, [row.id]: url }));
          } catch {
            setSignedUrls((prev) => ({ ...prev, [row.id]: null }));
          }
        }),
      );
    },
    [shareId, signedUrls],
  );

  const openAttachment = async (row) => {
    setAttachError('');
    try {
      const url = signedUrls[row.id] || (await fetchPublicAttachmentUrl(shareId, row.id));
      if (url && !signedUrls[row.id]) {
        setSignedUrls((prev) => ({ ...prev, [row.id]: url }));
      }
      setLightbox({
        url,
        mimeType: row.mime_type,
        fileName: row.file_name,
      });
    } catch {
      setAttachError('Could not open this attachment.');
    }
  };

  const fmtSettle = (amount) => formatMoneyWithCode(amount, settleCode);

  if (status === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading…
        </Typography>
      </Container>
    );
  }

  if (status === 'error' || !group) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Link didn’t work
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This share may have been revoked or the link is invalid. Ask for a new link.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Open Evenly
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        Shared group
      </Typography>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {group.name || 'Group'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Read-only view. Settlement shown in {settleCode}.
      </Typography>

      {fxError ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {fxError}
        </Alert>
      ) : null}
      {attachError ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAttachError('')}>
          {attachError}
        </Alert>
      ) : null}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Receipts
      </Typography>
      {receipts.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">No receipts in this group.</Typography>
        </Paper>
      ) : (
        <Box sx={{ mb: 3 }}>
          {receipts
            .slice()
            .sort((a, b) => (b.date || 0) - (a.date || 0))
            .map((receipt) => {
              const code = normalizeCurrencyCode(receipt.currencyCode || settleCode);
              const total = receiptTotal(receipt);
              const items = idMapToList(receipt.items);
              const payer = receipt.paidById ? personName(peopleMap, receipt.paidById) : 'Not set';
              return (
                <Accordion
                  key={receipt.id}
                  disableGutters
                  onChange={(_e, expanded) => {
                    if (expanded) prefetchAttachments(receipt);
                  }}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                      <Typography fontWeight={700} noWrap>
                        {receipt.title || 'Receipt'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(receipt.date)}
                        {receipt.paidById ? ` · Paid by ${payer}` : ' · No payer'}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800} sx={{ alignSelf: 'center' }}>
                      {formatMoneyWithCode(total, code)}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {items.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No items
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {items.map((item, idx) => {
                          const shares = Object.entries(receipt.itemToPersonQuantityMap?.[item.id] || {})
                            .filter(([, q]) => q > 0)
                            .map(([pid]) => personName(peopleMap, pid));
                          return (
                            <Box key={item.id}>
                              {idx > 0 && <Divider />}
                              <ListItem sx={{ px: 0, py: 1, alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography>{item.name || 'Item'}</Typography>
                                  {shares.length > 0 ? (
                                    <Typography variant="caption" color="text.secondary">
                                      {shares.join(', ')}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <Typography fontWeight={700}>
                                  {formatMoneyWithCode(item.cost, code)}
                                </Typography>
                              </ListItem>
                            </Box>
                          );
                        })}
                      </List>
                    )}
                    {(receipt.discountCost || receipt.taxCost || receipt.tipCost) ? (
                      <Box sx={{ mt: 1 }}>
                        {receipt.discountCost ? (
                          <Typography variant="body2" color="text.secondary">
                            Discount {formatMoneyWithCode(receipt.discountCost, code)}
                          </Typography>
                        ) : null}
                        {receipt.taxCost ? (
                          <Typography variant="body2" color="text.secondary">
                            Tax {formatMoneyWithCode(receipt.taxCost, code)}
                            {receipt.taxBehavior === 'inclusive' ? ' (included)' : ''}
                          </Typography>
                        ) : null}
                        {receipt.tipCost ? (
                          <Typography variant="body2" color="text.secondary">
                            Tip {formatMoneyWithCode(receipt.tipCost, code)}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : null}
                    <SharedReceiptAttachments
                      attachments={receipt.attachments}
                      signedUrls={signedUrls}
                      onOpen={openAttachment}
                    />
                  </AccordionDetails>
                </Accordion>
              );
            })}
        </Box>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Settle up
      </Typography>
      {transfers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography color="text.secondary">Everyone is settled up!</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {transfers.map((row, idx) => {
              const from = personName(peopleMap, row.from);
              const to = personName(peopleMap, row.to);
              return (
                <Box key={`${row.from}-${row.to}-${idx}`}>
                  {idx > 0 && <Divider />}
                  <ListItem sx={{ py: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'error.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                        {nameToInitials(from)}
                      </Avatar>
                      <Typography fontWeight={700} sx={{ maxWidth: 140 }} noWrap title={from}>
                        {from}
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                        {nameToInitials(to)}
                      </Avatar>
                      <Typography fontWeight={700} sx={{ maxWidth: 140 }} noWrap title={to}>
                        {to}
                      </Typography>
                    </Box>
                    <Chip label={fmtSettle(row.amount)} color="primary" sx={{ fontWeight: 800 }} />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button component={RouterLink} to="/" variant="outlined" size="large">
          Open Evenly
        </Button>
      </Box>

      <AttachmentLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        url={lightbox?.url || ''}
        mimeType={lightbox?.mimeType || ''}
        fileName={lightbox?.fileName || ''}
      />
    </Container>
  );
}
