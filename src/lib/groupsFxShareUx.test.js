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
});

test('subprocessors list dated FX hosts', () => {
  const src = read('src/lib/subprocessors.js');
  assert.match(src, /frankfurter\.dev/);
  assert.match(src, /2024-03-02/);
});
