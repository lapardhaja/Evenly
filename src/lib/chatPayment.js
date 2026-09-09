import { conversionFactorFromUsdRates, formatMoneyWithCode, normalizeCurrencyCode } from './currencies.js';
import { isValidVenmoUsername, normalizeVenmoUsername } from './venmoLinks.js';

export const MESSAGE_BODY_MAX = 2000;
export const PAYMENT_STATUSES = ['requested', 'paid', 'canceled'];

export function buildPaymentPayload({
  groupId,
  fromUserId,
  toUserId,
  fromPersonId,
  toPersonId,
  amount,
  currency,
  transferKey,
  venmoUsername,
  status = 'requested',
} = {}) {
  const n = Number(amount);
  const amountOk = Number.isFinite(n) && n >= 0.01;
  const st = PAYMENT_STATUSES.includes(status) ? status : 'requested';
  const handle = normalizeVenmoUsername(venmoUsername);
  return {
    group_id: groupId || null,
    from_user_id: fromUserId || null,
    to_user_id: toUserId || null,
    from_person_id: fromPersonId || null,
    to_person_id: toPersonId || null,
    amount: amountOk ? Math.round(n * 100) / 100 : 0,
    currency: normalizeCurrencyCode(currency || 'USD'),
    transfer_key: transferKey || '',
    status: st,
    venmo_username: isValidVenmoUsername(handle) ? handle : null,
  };
}

export function parsePaymentPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const status = PAYMENT_STATUSES.includes(raw.status) ? raw.status : 'requested';
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return {
    group_id: raw.group_id || null,
    from_user_id: raw.from_user_id || null,
    to_user_id: raw.to_user_id || null,
    from_person_id: raw.from_person_id || null,
    to_person_id: raw.to_person_id || null,
    amount,
    currency: normalizeCurrencyCode(raw.currency || 'USD'),
    transfer_key: typeof raw.transfer_key === 'string' ? raw.transfer_key : '',
    status,
    venmo_username: raw.venmo_username || null,
  };
}

export function paymentPreviewText(payload, { fromName = 'Someone', toName = 'someone' } = {}) {
  const p = parsePaymentPayload(payload);
  if (!p) return 'Payment';
  const money = formatMoneyWithCode(p.amount, p.currency);
  if (p.status === 'paid') return `${fromName} paid ${toName} ${money}`;
  if (p.status === 'canceled') return `Canceled: ${fromName} → ${toName} ${money}`;
  return `${fromName} → ${toName} ${money}`;
}

export function venmoUsdAmount(amount, fromCurrency, rates) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0.01) return null;
  const from = normalizeCurrencyCode(fromCurrency || 'USD');
  if (from === 'USD') return Math.round(n * 100) / 100;
  const factor = conversionFactorFromUsdRates(rates, from, 'USD');
  if (factor == null) return null;
  const usd = n * factor;
  if (!Number.isFinite(usd) || usd < 0.01) return null;
  return Math.round(usd * 100) / 100;
}

export function venmoNoteForTransfer({ groupName, fromName, toName } = {}) {
  const g = (groupName && String(groupName).trim()) || 'Group';
  const from = (fromName && String(fromName).trim()) || 'Someone';
  const to = (toName && String(toName).trim()) || 'someone';
  return `Evenly · ${g} · ${from} → ${to}`.slice(0, 280);
}

export function clipMessageBody(body) {
  const s = typeof body === 'string' ? body : '';
  return s.trim().slice(0, MESSAGE_BODY_MAX);
}
