# Scan-assign review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After Gemini returns line items, the Review receipt dialog assigns people (chips + Everyone / Just me / Same as last) and Paid by, then `addReceiptWithItems` saves allocations so you do not have to open the items table.

**Architecture:** Pure assign state in `src/lib/scanAssign.js` (no React). `ScanReceiptDialog` owns the UI. `addReceiptWithItems` already creates item UUIDs; pass `itemToPersonQuantityMap` keyed by **scan row index** (or stable `clientId` on each scanned row) and map onto those UUIDs in the same loop. No schema change — `receipt_allocations` already syncs from the quantity maps.

**Tech Stack:** React 18, MUI 5, existing `ItemPersonAssign` for qty > 1, `node:test`, `npm test` / `npm run build`.

## Global Constraints

- Do not call Gemini again. Assign is 100% client-side on the scan result.
- Default: nobody on an item (same as today). One tap to fill.
- Qty 1: chip toggle 0/1. Qty > 1: existing stepper (`ItemPersonAssign`).
- “Same as last” matches **person** by `linkedUserId` then lowercase name; **item** by `normalizeItemName`. Skip unmatched rows; never invent people.
- Local-only and cloud both get this (allocations already persist both ways).
- Copy: short. No “AI assigned these for you.”
- Tests: `node:test` source + unit. `npm test` then `npm run build`.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/scanAssign.js` | Normalize names, toggle/everyone/me, last-receipt match, maps for save |
| `src/lib/scanAssign.test.js` | Unit tests for the above |
| `src/hooks/useGroupData.js` | `addReceiptWithItems` accepts `paidById` + per-item shares |
| `src/pages/ScanReceiptDialog.jsx` | Chips, Everyone / Just me, Same as last, Paid by |
| `src/pages/GroupReceiptsTab.jsx` | Pass people, last receipt, current user person id into the dialog |
| `src/lib/groupsFxShareUx.test.js` (or scanAssign source grep) | Dialog still confirms; new controls exist |

Out of scope for this plan: cross-group IOU home, auto-post to chat, share-sheet capture.

## Current hole

`handleScanConfirm` in `src/pages/GroupReceiptsTab.jsx` calls `addReceiptWithItems` which hardcodes empty maps and `paidById: ''`. Review dialog only lists names under a collapsed “Show preview”. Assign happens later in `ReceiptInfoItemsTab`.

---

### Task 1: `scanAssign` lib

**Files:**
- Create: `src/lib/scanAssign.js`
- Test: `src/lib/scanAssign.test.js`

**Interfaces:**
- Produces:
  - `normalizeItemName(name) → string`
  - `personMatchKey(person) → string` (`u:` + linkedUserId, else `n:` + lower name)
  - `toggleShare(shares, personId, itemQty) → number` (qty 1: 0↔1; qty>1: cycle is **not** here — caller uses explicit qty)
  - `everyoneShares(personIds) → Record<personId, 1>`
  - `justMeShares(personId) → Record<personId, 1>`
  - `matchLastItemShares({ lastItemName, lastSharesByPersonKey, newPeople }) → Record<personId, number> | null`
  - `applyLastReceipt({ lastReceipt, newItems, newPeople }) → Record<itemIndex, Record<personId, number>>`
  - `quantityMapsFromIndexedItems(itemsWithIds, sharesByIndex) → { personToItemQuantityMap, itemToPersonQuantityMap }`

- [ ] **Step 1: Write the failing tests** in `src/lib/scanAssign.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeItemName,
  personMatchKey,
  everyoneShares,
  justMeShares,
  matchLastItemShares,
  applyLastReceipt,
  quantityMapsFromIndexedItems,
} from './scanAssign.js';

test('normalizeItemName collapses case and space', () => {
  assert.equal(normalizeItemName('  Pad  Thai '), 'pad thai');
});

test('personMatchKey prefers linkedUserId', () => {
  assert.equal(personMatchKey({ id: 'p1', name: 'Alex', linkedUserId: 'u1' }), 'u:u1');
  assert.equal(personMatchKey({ id: 'p1', name: 'Alex' }), 'n:alex');
});

test('everyoneShares and justMeShares', () => {
  assert.deepEqual(everyoneShares(['a', 'b']), { a: 1, b: 1 });
  assert.deepEqual(justMeShares('a'), { a: 1 });
});

test('matchLastItemShares remaps by linked user then name', () => {
  const shares = matchLastItemShares({
    lastSharesByPersonKey: { 'u:u1': 1, 'n:sam': 1 },
    newPeople: [
      { id: 'np1', name: 'Alex', linkedUserId: 'u1' },
      { id: 'np2', name: 'Sam' },
    ],
  });
  assert.deepEqual(shares, { np1: 1, np2: 1 });
});

test('applyLastReceipt copies shares for renamed-id same-name items', () => {
  const lastReceipt = {
    items: { old: { name: 'Pad Thai', quantity: 1 } },
    itemToPersonQuantityMap: { old: { op1: 1 } },
    people: [{ id: 'op1', name: 'Alex', linkedUserId: 'u1' }],
  };
  const got = applyLastReceipt({
    lastReceipt,
    newItems: [{ name: 'pad thai', quantity: 1 }],
    newPeople: [{ id: 'np1', name: 'ALEX', linkedUserId: 'u1' }],
  });
  assert.deepEqual(got, { 0: { np1: 1 } });
});

test('quantityMapsFromIndexedItems writes both maps', () => {
  const maps = quantityMapsFromIndexedItems(
    [{ id: 'i1' }, { id: 'i2' }],
    { 0: { p1: 1 }, 1: { p1: 1, p2: 1 } },
  );
  assert.equal(maps.itemToPersonQuantityMap.i1.p1, 1);
  assert.equal(maps.personToItemQuantityMap.p2.i2, 1);
});
```

- [ ] **Step 2: Run** `node --test src/lib/scanAssign.test.js` — expect `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement** `src/lib/scanAssign.js` to pass. `applyLastReceipt` only copies when `normalizeItemName` matches **exactly one** last item; duplicate names on the last receipt → skip that new row.

- [ ] **Step 4: Re-run tests — pass. Commit** `feat: scan-assign matching helpers`.

---

### Task 2: Seed allocations on create

**Files:**
- Modify: `src/hooks/useGroupData.js` (`addReceiptWithItems`)
- Test: `src/lib/scanAssign.test.js` (keep maps helper) plus a source grep or a small test if you extract the seed loop.

**Interfaces:**
- Consumes: `quantityMapsFromIndexedItems`
- Produces: `addReceiptWithItems(title, lineItems, charges)` where `charges` may include:
  - `paidById?: string`
  - `sharesByIndex?: Record<number, Record<string, number>>`

Inside the existing item loop, keep an `orderedIds = []` as you `items[id] = …`, then:

```js
const maps = quantityMapsFromIndexedItems(
  orderedIds.map((id) => ({ id })),
  charges.sharesByIndex || {},
);
// receipt: paidById: charges.paidById && items/people allow it ? charges.paidById : ''
// personToItemQuantityMap / itemToPersonQuantityMap from maps
```

Ignore share keys that are not in `orderedIds` / not in current group people. Drop qty that is not a finite number `>= 1`.

- [ ] **Step 1: Failing test** — grep or a tiny exported `seedScannedReceipt(lineItems, charges)` if you do not want to mount the hook. Prefer exporting a pure `buildScannedReceiptRecord(lineItems, charges, { displayCurrency, now })` from `src/lib/scanAssign.js` and calling it from `addReceiptWithItems`. That keeps TDD off the hook.

```js
test('buildScannedReceiptRecord attaches shares and paidById', () => {
  const rec = buildScannedReceiptRecord(
    [{ name: 'Soup', cost: 8, quantity: 1 }],
    { paidById: 'p1', sharesByIndex: { 0: { p1: 1, p2: 1 } }, taxCost: 0, tipCost: 0, discountCost: 0 },
    { displayCurrency: 'USD', now: 1 },
  );
  const itemId = Object.keys(rec.items)[0];
  assert.equal(rec.paidById, 'p1');
  assert.equal(rec.itemToPersonQuantityMap[itemId].p2, 1);
});
```

- [ ] **Step 2: Implement `buildScannedReceiptRecord`, switch `addReceiptWithItems` to use it.**

- [ ] **Step 3: `npm test` green. Commit** `feat: save scan allocations and paidBy on create`.

---

### Task 3: Review dialog — assign + paid by

**Files:**
- Modify: `src/pages/ScanReceiptDialog.jsx`
- Modify: `src/pages/GroupReceiptsTab.jsx` (props)
- Test: extend `src/lib/groupsFxShareUx.test.js` (source) **and** keep logic in the lib so UI stays thin.

**Props to add on `ScanReceiptDialog`:**

```js
people = []           // [{ id, name, linkedUserId? }]
mePersonId = ''       // group person id for the signed-in user, else ''
lastReceipt = null    // { items, itemToPersonQuantityMap, people, paidById } or null
```

**UI (same dialog, not a second screen):**

1. After tax/tip/mismatch block, **Paid by** `TextField select` (people + empty “Choose later”). Default `lastReceipt.paidById` if that id still exists, else `mePersonId`, else `''`.
2. If `lastReceipt` has items, button **Same as last receipt** → `setShares(applyLastReceipt(...))` and set paid by if last payer still in group.
3. Replace collapsed name-only preview with always-visible item cards:
   - name + `formatMoneyWithCode`
   - people as `Chip` (qty 1) or `ItemPersonAssign` (qty > 1)
   - text buttons **Everyone** / **Just me** (`Just me` hidden if `!mePersonId`)
4. `onConfirm(title, items, { …existing, paidById, sharesByIndex })`.
5. Soft `Alert` if some items have empty shares: “N items have nobody yet — you can assign after saving.” Do **not** block save.

- [ ] **Step 1: Failing source test** in `groupsFxShareUx.test.js`:

```js
test('scan review assigns people before create', () => {
  const dlg = read('src/pages/ScanReceiptDialog.jsx');
  assert.match(dlg, /Same as last receipt/);
  assert.match(dlg, /Just me/);
  assert.match(dlg, /Everyone/);
  assert.match(dlg, /Paid by/);
  assert.match(dlg, /sharesByIndex/);
  const tab = read('src/pages/GroupReceiptsTab.jsx');
  assert.match(tab, /sharesByIndex/);
  assert.match(tab, /lastReceipt/);
});
```

- [ ] **Step 2: Implement dialog + pass from receipts tab:**

```js
const lastReceipt = useMemo(() => {
  const newest = sorted[0];
  if (!newest) return null;
  return {
    items: newest.items || group.receipts[newest.id]?.items,
    // prefer full receipt object from group.receipts[newest.id]
  };
}, […]);
```

Use `group.receipts[sorted[0].id]` for maps. `mePersonId`: person in `people` whose `linkedUserId === user.id`.

- [ ] **Step 3: `handleScanConfirm` forwards `paidById` + `sharesByIndex` into `addReceiptWithItems`.**

- [ ] **Step 4: `npm test` && `npm run build`. Commit** `feat: assign people on scan review`.

---

### Task 4: Manual verify

- [ ] Scan (or `#` local photo) in a group with ≥2 people.
- [ ] Hunting/review: tap two chips, Paid by, Create → receipt items already split.
- [ ] Second scan: **Same as last receipt** copies overlapping names.
- [ ] Qty 2 item: stepper still works; Everyone is qty-1 only (same rule as `assignAllPeopleToItem`).
- [ ] Empty scan (no lines) still creates; assign UI hidden.
- [ ] Desktop + 390px: chips wrap, dialog scrolls, Create stays on `DialogActions`.

---

## Self-review

- Spec: assign on scan, last-receipt, paid by, persist maps — Tasks 1–3.
- No Gemini / no new tables.
- `buildScannedReceiptRecord` is the hook-test escape hatch so TDD does not require rendering `useGroup`.
- Follow-ups (not this PR): IOU home, chat receipt card.
