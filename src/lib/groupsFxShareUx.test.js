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

test('groups list explains dated FX and never uses a mystery * total', () => {
  const page = read('src/pages/GroupsPage.jsx');
  assert.match(page, /GROUP_TOTAL_FX_DATE_COPY/);
  assert.match(page, /GROUP_TOTAL_FX_FAILED_COPY/);
  assert.match(page, /getUsdRatesTablesForDates/);
  assert.doesNotMatch(page, /} \*`/);
  assert.doesNotMatch(page, /formatMoneyWithCode\([^)]+\)\} \*/);
});

test('settle uses receipt-date FX copy and Share settlement', () => {
  const settle = read('src/pages/GroupSettleTab.jsx');
  const share = read('src/components/SettlementShareDialog.jsx');
  assert.match(settle, /SETTLE_FX_DATE_COPY/);
  assert.match(settle, /loadReceiptFxFactors/);
  assert.match(settle, /Share settlement/);
  assert.match(share, /Share settlement/);
  assert.doesNotMatch(settle, /Share Cost Evenly/);
  assert.doesNotMatch(share, /Share Cost Evenly/);
  assert.match(settle, /I paid only marks it in Evenly/);
});

test('subprocessors list dated FX hosts', () => {
  const src = read('src/lib/subprocessors.js');
  assert.match(src, /frankfurter\.dev/);
  assert.match(src, /2024-03-02/);
});
