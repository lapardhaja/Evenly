import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('receipt detail has no People tab; /people redirects to the receipt', () => {
  const page = read('src/pages/ReceiptInfoPage.jsx');
  assert.equal(existsSync(join(root, 'src/pages/ReceiptInfoPeopleTab.jsx')), false);
  assert.doesNotMatch(page, /ReceiptInfoPeopleTab/);
  assert.doesNotMatch(page, /TABS\s*=/);
  assert.match(page, /tab !== 'people'/);
  assert.match(page, /replace:\s*true/);
  assert.match(page, /ReceiptInfoItemsTab/);
});

test('groups list has no mystery * total and no FX lecture caption', () => {
  const page = read('src/pages/GroupsPage.jsx');
  assert.match(page, /GROUP_TOTAL_FX_FAILED_COPY/);
  assert.match(page, /convertGroupTotals/);
  assert.doesNotMatch(page, /GROUP_TOTAL_FX_DATE_COPY/);
  assert.doesNotMatch(page, /} \*`/);
  assert.doesNotMatch(page, /formatMoneyWithCode\([^)]+\)\} \*/);
});

test('settle share label matches the dialog it opens', () => {
  const settle = read('src/pages/GroupSettleTab.jsx');
  const share = read('src/components/SettlementShareDialog.jsx');
  assert.match(settle, /loadReceiptFxFactors/);
  assert.match(settle, /isSupabaseConfigured\(\) \? 'Share group' : 'Share settlement'/);
  assert.match(share, /Share settlement/);
  assert.doesNotMatch(settle, /Share Cost Evenly/);
  assert.doesNotMatch(share, /Share Cost Evenly/);
  assert.doesNotMatch(settle, /SETTLE_FX_DATE_COPY/);
  assert.doesNotMatch(settle, /I paid only marks it in Evenly/);
});

test('scan overlay still rotates loading quips', () => {
  assert.equal(existsSync(join(root, 'src/data/scanLoadingQuips.js')), true);
  const overlay = read('src/components/ReceiptScanLoadingOverlay.jsx');
  const quips = read('src/data/scanLoadingQuips.js');
  assert.match(overlay, /setInterval/);
  assert.match(overlay, /Crunching numbers/);
  assert.match(overlay, /SCAN_LOADING_QUIPS_EXTRA/);
  assert.match(quips, /just a bite/);
});

test('invite-friend row does not overlay In group on the username', () => {
  const people = read('src/pages/GroupPeopleTab.jsx');
  assert.doesNotMatch(people, /Already in group/);
  assert.match(people, /label="In group"/);
  assert.match(people, /minWidth: 0/);
  assert.match(people, /Group QR/);
  assert.match(people, /InviteQrDialog/);
});

test('creating a group opens people with the join QR', () => {
  const groups = read('src/pages/GroupsPage.jsx');
  assert.match(groups, /showJoinQr/);
  const friends = read('src/pages/FriendsPage.jsx');
  assert.match(friends, /My QR/);
  assert.match(friends, /Scan QR/);
  assert.match(friends, /isSupabaseConfigured/);
});

test('groups + SpeedDial offers Scan QR to join a group or add a friend', () => {
  const groups = read('src/pages/GroupsPage.jsx');
  assert.match(groups, /SpeedDial/);
  assert.match(groups, /tooltipTitle="New group"/);
  assert.match(groups, /tooltipTitle="Scan QR"/);
  assert.match(groups, /navigate\('\/scan'\)/);
  assert.match(groups, /create one or scan a QR/);
});

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

test('groups home shows cross-group IOUs', () => {
  const groups = read('src/pages/GroupsPage.jsx');
  assert.match(groups, /HomeBalancesCard/);
  assert.match(groups, /useHomeBalances/);
  assert.match(groups, /you're owed/);
  assert.match(groups, /\/groups\/\$\{id\}\/settle/);
  const card = read('src/components/HomeBalancesCard.jsx');
  assert.match(card, /You're owed/);
  assert.match(card, /You owe/);
  assert.match(card, /You're even/);
});

test('subprocessors list dated FX hosts', () => {
  const src = read('src/lib/subprocessors.js');
  assert.match(src, /frankfurter\.dev/);
  assert.match(src, /2024-03-02/);
});
