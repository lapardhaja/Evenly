import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSettlementSummaryText } from './formatSettlementSummary.js';

test('formatSettlementSummaryText: transfers', () => {
  const text = formatSettlementSummaryText({
    groupName: 'Dinner',
    transfers: [
      { from: 'a', to: 'b', amount: 12.34 },
      { from: 'c', to: 'b', amount: 5 },
    ],
    peopleById: {
      a: { name: 'Alex' },
      b: { name: 'Sam' },
      c: { name: 'Jordan' },
    },
    missingPayerReceiptTitles: [],
  });
  assert.ok(text.includes('Dinner — Settle up'));
  assert.ok(text.includes('Alex pays Sam'));
  assert.ok(text.includes('Jordan pays Sam'));
  assert.ok(text.includes('Evenly'));
});

test('formatSettlementSummaryText: no transfers', () => {
  const text = formatSettlementSummaryText({
    groupName: 'Trip',
    transfers: [],
    peopleById: {},
  });
  assert.ok(text.includes('Everyone is settled up'));
});

test('formatSettlementSummaryText: missing payer note', () => {
  const text = formatSettlementSummaryText({
    groupName: 'G',
    transfers: [{ from: 'a', to: 'b', amount: 1 }],
    peopleById: { a: { name: 'A' }, b: { name: 'B' } },
    missingPayerReceiptTitles: ['Lunch'],
  });
  assert.ok(text.includes('Lunch'));
  assert.ok(text.includes('no payer set'));
});
