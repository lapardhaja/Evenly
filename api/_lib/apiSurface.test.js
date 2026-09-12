import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('api/ root only exports the three Vercel handlers (Hobby 12-function cap)', () => {
  const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const files = readdirSync(apiDir)
    .filter((f) => f.endsWith('.js'))
    .sort();
  assert.deepEqual(files, ['chat-push.js', 'delete-account.js', 'scan.js']);
});
