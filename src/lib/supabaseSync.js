/**
 * Maps between app shape (useGroupData / localStorage v2) and normalized Supabase tables.
 */

import { normalizeCurrencyCode } from './currencies.js';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<{ groups: Record<string, unknown> }>}
 */
export async function loadNormalizedData(supabase, userId) {
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .eq('user_id', userId);
  if (gErr) throw gErr;

  const out = { groups: {} };

  for (const g of groups || []) {
    const gid = g.id;
    const { data: people, error: pErr } = await supabase
      .from('group_people')
      .select('*')
      .eq('group_id', gid);
    if (pErr) throw pErr;

    const { data: receipts, error: rErr } = await supabase
      .from('receipts')
      .select('*')
      .eq('group_id', gid);
    if (rErr) throw rErr;

    const peopleMap = {};
    for (const p of people || []) {
      peopleMap[p.id] = { name: p.name };
    }

    const receiptsMap = {};
    for (const rec of receipts || []) {
      const rid = rec.id;
      const { data: items, error: iErr } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', rid)
        .order('position', { ascending: true });
      if (iErr) throw iErr;

      const { data: allocs, error: aErr } = await supabase
        .from('receipt_allocations')
        .select('*')
        .eq('receipt_id', rid);
      if (aErr) throw aErr;

      const itemsMap = {};
      for (const it of items || []) {
        itemsMap[it.id] = {
          name: it.name,
          cost: Number(it.cost),
          quantity: it.quantity ?? 1,
        };
      }

      const p2i = {};
      const i2p = {};
      for (const a of allocs || []) {
        const q = Number(a.quantity);
        if (!Number.isFinite(q) || q <= 0) continue;
        if (!p2i[a.person_id]) p2i[a.person_id] = {};
        p2i[a.person_id][a.item_id] = q;
        if (!i2p[a.item_id]) i2p[a.item_id] = {};
        i2p[a.item_id][a.person_id] = q;
      }

      const ppm = rec.person_paid_map;
      receiptsMap[rid] = {
        title: rec.title,
        date: Number(rec.date_ms),
        locked: !!rec.locked,
        paidById: rec.paid_by_id || '',
        currencyCode: normalizeCurrencyCode(rec.currency_code || 'USD'),
        taxBehavior: rec.tax_behavior === 'inclusive' ? 'inclusive' : 'exclusive',
        items: itemsMap,
        personToItemQuantityMap: p2i,
        itemToPersonQuantityMap: i2p,
        personPaidMap: ppm && typeof ppm === 'object' ? ppm : {},
        taxCost: Number(rec.tax_cost) || 0,
        tipCost: Number(rec.tip_cost) || 0,
        discountCost: Number(rec.discount_cost) || 0,
      };
    }

    out.groups[gid] = {
      name: g.name,
      date: Number(g.date_ms),
      displayCurrency: normalizeCurrencyCode(g.display_currency || 'USD'),
      people: peopleMap,
      receipts: receiptsMap,
    };
  }

  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ groups: Record<string, any> }} data
 */
export async function persistNormalizedData(supabase, userId, data) {
  const localGroupIds = Object.keys(data.groups || {});

  const { data: dbGroups, error: listErr } = await supabase
    .from('groups')
    .select('id')
    .eq('user_id', userId);
  if (listErr) throw listErr;

  const dbIds = new Set((dbGroups || []).map((row) => row.id));
  for (const id of dbIds) {
    if (!localGroupIds.includes(id)) {
      const { error } = await supabase.from('groups').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  }

  const nowIso = new Date().toISOString();

  for (const gid of localGroupIds) {
    const g = data.groups[gid];
    const { error: ugErr } = await supabase.from('groups').upsert(
      {
        id: gid,
        user_id: userId,
        name: g.name,
        date_ms: g.date,
        display_currency: normalizeCurrencyCode(g.displayCurrency || 'USD'),
        updated_at: nowIso,
      },
      { onConflict: 'id' },
    );
    if (ugErr) throw ugErr;

    const localPeopleIds = Object.keys(g.people || {});
    const { data: dbPeople, error: dpErr } = await supabase
      .from('group_people')
      .select('id')
      .eq('group_id', gid);
    if (dpErr) throw dpErr;
    for (const row of dbPeople || []) {
      if (!localPeopleIds.includes(row.id)) {
        const { error } = await supabase.from('group_people').delete().eq('id', row.id);
        if (error) throw error;
      }
    }
    for (const pid of localPeopleIds) {
      const { error } = await supabase.from('group_people').upsert(
        {
          id: pid,
          group_id: gid,
          name: g.people[pid].name,
          updated_at: nowIso,
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
    }

    const localReceiptIds = Object.keys(g.receipts || {});
    const { data: dbReceipts, error: drErr } = await supabase
      .from('receipts')
      .select('id')
      .eq('group_id', gid);
    if (drErr) throw drErr;
    for (const row of dbReceipts || []) {
      if (!localReceiptIds.includes(row.id)) {
        const { error } = await supabase.from('receipts').delete().eq('id', row.id);
        if (error) throw error;
      }
    }

    for (const rid of localReceiptIds) {
      const r = g.receipts[rid];
      let paidBy =
        r.paidById && String(r.paidById).length > 0 ? r.paidById : null;
      if (paidBy && !localPeopleIds.includes(paidBy)) paidBy = null;

      const { error: urErr } = await supabase.from('receipts').upsert(
        {
          id: rid,
          group_id: gid,
          title: r.title,
          date_ms: r.date,
          locked: !!r.locked,
          paid_by_id: paidBy,
          currency_code: normalizeCurrencyCode(r.currencyCode || 'USD'),
          tax_behavior: r.taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive',
          tax_cost: r.taxCost ?? 0,
          tip_cost: r.tipCost ?? 0,
          discount_cost: r.discountCost ?? 0,
          person_paid_map: r.personPaidMap || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' },
      );
      if (urErr) throw urErr;

      const { data: dbItems, error: diErr } = await supabase
        .from('receipt_items')
        .select('id')
        .eq('receipt_id', rid);
      if (diErr) throw diErr;
      for (const row of dbItems || []) {
        if (!r.items?.[row.id]) {
          const { error } = await supabase.from('receipt_items').delete().eq('id', row.id);
          if (error) throw error;
        }
      }

      const itemEntries = Object.entries(r.items || {});
      let pos = 0;
      for (const [iid, it] of itemEntries) {
        const { error } = await supabase.from('receipt_items').upsert(
          {
            id: iid,
            receipt_id: rid,
            name: it.name,
            cost: it.cost,
            quantity: it.quantity ?? 1,
            position: pos,
            updated_at: nowIso,
          },
          { onConflict: 'id' },
        );
        if (error) throw error;
        pos += 1;
      }

      const { error: delA } = await supabase.from('receipt_allocations').delete().eq('receipt_id', rid);
      if (delA) throw delA;

      const allocRows = [];
      for (const [personId, map] of Object.entries(r.personToItemQuantityMap || {})) {
        for (const [itemId, qty] of Object.entries(map || {})) {
          const q = Number(qty);
          if (!Number.isFinite(q) || q <= 0) continue;
          allocRows.push({
            receipt_id: rid,
            person_id: personId,
            item_id: itemId,
            quantity: q,
          });
        }
      }
      if (allocRows.length > 0) {
        const { error: insA } = await supabase.from('receipt_allocations').insert(allocRows);
        if (insA) throw insA;
      }
    }
  }
}
