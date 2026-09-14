import currency from 'currency.js';
import { computeNetBalances, minimizeTransfers } from '../functions/settlement.js';
import { idMapToList } from '../functions/utils.js';
import { SELF_PERSON_NAME } from './defaultGroupPeople.js';
import { getUsdRatesTablesForDates, normalizeCurrencyCode } from './currencies.js';
import {
  listReceiptsCurrencyMeta,
  receiptFxFactorsFromTables,
  scaleGroupMoneyForDisplay,
} from './settlementCurrency.js';
import { transferStorageKey, normalizeStoredSettledKeys } from './settledTransfersKey.js';

export function findMePersonId(peopleMap, userId) {
  const people = idMapToList(peopleMap);
  const uid = typeof userId === 'string' ? userId.trim() : '';
  if (uid) {
    const hit = people.find((p) => p.linkedUserId && String(p.linkedUserId) === uid);
    if (hit) return hit.id;
  }
  const mes = people.filter(
    (p) =>
      !p.linkedUserId &&
      String(p.name || '').trim().toLowerCase() === SELF_PERSON_NAME.toLowerCase(),
  );
  return mes.length === 1 ? mes[0].id : '';
}

export function pickHomeCurrency(groupsMap) {
  const codes = Object.values(groupsMap || {}).map((g) =>
    normalizeCurrencyCode(g?.displayCurrency || 'USD'),
  );
  if (codes.length === 0) return 'USD';
  const first = codes[0];
  if (codes.every((c) => c === first)) return first;
  return 'USD';
}

export function counterpartyKey(person, groupId) {
  const linked = typeof person?.linkedUserId === 'string' ? person.linkedUserId.trim() : '';
  if (linked) return `u:${linked}`;
  return `g:${groupId}:${person?.id || ''}`;
}

function emptySummary(currency) {
  return {
    currency: normalizeCurrencyCode(currency || 'USD'),
    visible: false,
    owedToMe: 0,
    iOwe: 0,
    rows: [],
    groupNets: {},
  };
}

function mergedSettledList(group, groupId, getLocalSettled) {
  const fromGroup = Array.isArray(group?.settledTransfers)
    ? group.settledTransfers.filter((x) => typeof x === 'string')
    : [];
  const fromLocal =
    typeof getLocalSettled === 'function'
      ? (getLocalSettled(groupId) || []).filter((x) => typeof x === 'string')
      : [];
  return [...new Set([...fromGroup, ...fromLocal])];
}

/**
 * Per-receipt FX into `target`, batched across every group.
 */
export async function loadHomeFxFactors(groupsMap, targetRaw) {
  const target = normalizeCurrencyCode(targetRaw || 'USD');
  const factorsByGroup = {};
  const needByGroup = {};
  const dates = [];
  let anyNeed = false;
  for (const [gid, g] of Object.entries(groupsMap || {})) {
    factorsByGroup[gid] = {};
    needByGroup[gid] = [];
    for (const row of listReceiptsCurrencyMeta(g)) {
      if (normalizeCurrencyCode(row.currencyCode || 'USD') === target) {
        factorsByGroup[gid][row.id] = 1;
      } else {
        anyNeed = true;
        needByGroup[gid].push(row);
        dates.push(row.date);
      }
    }
  }
  if (!anyNeed) {
    return { factorsByGroup, failed: [], ratesAvailable: true };
  }
  const tables = await getUsdRatesTablesForDates(dates);
  const failed = [];
  let ratesAvailable = false;
  for (const [gid, need] of Object.entries(needByGroup)) {
    if (!need.length) continue;
    const rest = receiptFxFactorsFromTables(need, tables, target);
    if (rest.ratesAvailable) ratesAvailable = true;
    Object.assign(factorsByGroup[gid], rest.factors);
    for (const id of rest.failed) failed.push(`${gid}:${id}`);
  }
  return { factorsByGroup, failed, ratesAvailable };
}

/**
 * Open IOUs that involve the current user, netted across groups when the
 * other person is the same linked account.
 */
export function buildHomeBalanceSummary({
  groupsMap,
  userId = '',
  currency: currencyCode = 'USD',
  factorsByGroup = {},
  getLocalSettled,
} = {}) {
  const code = normalizeCurrencyCode(currencyCode);
  const out = emptySummary(code);
  const buckets = new Map();

  for (const [groupId, group] of Object.entries(groupsMap || {})) {
    const mePersonId = findMePersonId(group?.people, userId);
    if (!mePersonId) continue;
    const receiptCount = Object.keys(group?.receipts || {}).length;
    if (receiptCount === 0) continue;
    out.visible = true;

    const scaled = scaleGroupMoneyForDisplay(group, factorsByGroup[groupId] || {});
    const transfers = minimizeTransfers(computeNetBalances(scaled));
    const settled = new Set(
      normalizeStoredSettledKeys(mergedSettledList(group, groupId, getLocalSettled), transfers),
    );

    let groupNet = 0;
    for (const t of transfers) {
      if (t.from !== mePersonId && t.to !== mePersonId) continue;
      if (settled.has(transferStorageKey(t))) continue;
      const signed = t.to === mePersonId ? t.amount : -t.amount;
      if (Math.abs(signed) < 0.01) continue;
      groupNet = currency(groupNet).add(signed).value;

      const otherId = t.from === mePersonId ? t.to : t.from;
      const other = { id: otherId, ...(group.people?.[otherId] || {}) };
      const key = counterpartyKey(other, groupId);
      const prev = buckets.get(key) || {
        key,
        name: other.name || 'Someone',
        linkedUserId: typeof other.linkedUserId === 'string' ? other.linkedUserId.trim() : '',
        amount: 0,
        groups: [],
        nameAbs: 0,
      };
      prev.amount = currency(prev.amount).add(signed).value;
      prev.groups.push({
        groupId,
        groupName: group.name || 'Group',
        amount: currency(signed).value,
      });
      const abs = Math.abs(signed);
      if (abs >= prev.nameAbs && other.name) {
        prev.name = other.name;
        prev.nameAbs = abs;
      }
      buckets.set(key, prev);
    }
    if (Math.abs(groupNet) >= 0.01) out.groupNets[groupId] = currency(groupNet).value;
  }

  const rows = [];
  for (const row of buckets.values()) {
    if (Math.abs(row.amount) < 0.01) continue;
    delete row.nameAbs;
    row.amount = currency(row.amount).value;
    row.groups = row.groups.filter((g) => Math.abs(g.amount) >= 0.01);
    rows.push(row);
    if (row.amount > 0) out.owedToMe = currency(out.owedToMe).add(row.amount).value;
    else out.iOwe = currency(out.iOwe).add(Math.abs(row.amount)).value;
  }

  rows.sort(
    (a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.name.localeCompare(b.name),
  );
  out.rows = rows;
  out.owedToMe = currency(out.owedToMe).value;
  out.iOwe = currency(out.iOwe).value;
  return out;
}

export function groupNetDirection(net) {
  const n = Number(net) || 0;
  if (n > 0.005) return 'owed';
  if (n < -0.005) return 'owe';
  return '';
}
