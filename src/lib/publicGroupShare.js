import { computeNetBalances, minimizeTransfers } from '../functions/settlement.js';

const ATTACHMENT_BUCKET = 'receipt-attachments';
const SIGNED_URL_TTL_SECONDS = 120;

function clientOrThrow() {
  // Deferred import: pure-helper unit tests run under node:test without Vite's import.meta.env.
  return import('./supabaseClient.js').then(({ getSupabase, isSupabaseConfigured }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    return client;
  });
}

export function publicSharePath(shareId) {
  return `/share/${shareId}`;
}

export function publicShareAbsoluteUrl(id) {
  if (typeof window === 'undefined') return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${publicSharePath(id)}`;
}

export function assertPublicSharePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('share not found');
  }
  if (!payload.id || !Array.isArray(payload.people) || !Array.isArray(payload.receipts)) {
    throw new Error('share not found');
  }
  return payload;
}

function allocationsToQuantityMaps(allocations) {
  const personToItemQuantityMap = {};
  const itemToPersonQuantityMap = {};
  for (const a of allocations || []) {
    const q = Number(a.quantity);
    if (!Number.isFinite(q) || q <= 0) continue;
    const personId = a.person_id;
    const itemId = a.item_id;
    if (!personId || !itemId) continue;
    if (!personToItemQuantityMap[personId]) personToItemQuantityMap[personId] = {};
    personToItemQuantityMap[personId][itemId] = q;
    if (!itemToPersonQuantityMap[itemId]) itemToPersonQuantityMap[itemId] = {};
    itemToPersonQuantityMap[itemId][personId] = q;
  }
  return { personToItemQuantityMap, itemToPersonQuantityMap };
}

export function publicSharePayloadToGroup(payload) {
  const people = {};
  for (const p of payload.people || []) {
    if (!p?.id) continue;
    people[p.id] = { name: p.name || '' };
  }

  const receipts = {};
  for (const rec of payload.receipts || []) {
    if (!rec?.id) continue;
    const items = {};
    for (const it of rec.items || []) {
      if (!it?.id) continue;
      items[it.id] = {
        name: it.name || '',
        cost: Number(it.cost) || 0,
        quantity: it.quantity ?? 1,
      };
    }
    const { personToItemQuantityMap, itemToPersonQuantityMap } = allocationsToQuantityMaps(
      rec.allocations,
    );
    receipts[rec.id] = {
      title: rec.title || '',
      date: Number(rec.date_ms) || 0,
      paidById: rec.paid_by_id || '',
      currencyCode: rec.currency_code || 'USD',
      taxBehavior: rec.tax_behavior === 'inclusive' ? 'inclusive' : 'exclusive',
      items,
      personToItemQuantityMap,
      itemToPersonQuantityMap,
      taxCost: Number(rec.tax_cost) || 0,
      tipCost: Number(rec.tip_cost) || 0,
      discountCost: Number(rec.discount_cost) || 0,
      attachments: Array.isArray(rec.attachments) ? rec.attachments : [],
    };
  }

  return {
    id: payload.group_id,
    name: payload.name || '',
    displayCurrency: payload.display_currency || 'USD',
    includeAttachments: !!payload.include_attachments,
    people,
    receipts,
  };
}

export function publicShareTransfers(group) {
  return minimizeTransfers(computeNetBalances(group));
}

export async function createPublicGroupShare(groupId, includeAttachments = true) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('create_public_group_share', {
    p_group_id: groupId,
    p_include_attachments: includeAttachments,
  });
  if (error) throw error;
  return data;
}

export async function revokePublicGroupShare(shareId) {
  const supabase = await clientOrThrow();
  const { error } = await supabase.rpc('revoke_public_group_share', {
    p_share_id: shareId,
  });
  if (error) throw error;
}

export async function fetchPublicGroupShare(shareId) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('get_public_group_share', {
    p_share_id: shareId,
  });
  if (error) throw error;
  return assertPublicSharePayload(data);
}

export async function fetchPublicAttachmentUrl(shareId, attachmentId) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('get_public_share_attachment_url', {
    p_share_id: shareId,
    p_attachment_id: attachmentId,
  });
  if (error) throw error;
  const path = typeof data === 'string' ? data : data?.storage_path;
  if (!path) throw new Error('share not found');
  const { data: signed, error: signedError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signedError) throw signedError;
  if (!signed?.signedUrl) throw new Error('share not found');
  return signed.signedUrl;
}
