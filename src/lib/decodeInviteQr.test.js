import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { parseInviteFromText } from './inviteCodes.js';
import { decodeInviteFromImageData } from './decodeInviteQr.js';

const TOKEN_G = `g_${'ab'.repeat(16)}`;
const TOKEN_F = `f_${'cd'.repeat(16)}`;

function rasterizeQr(text, scale = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const size = n * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const v = qr.modules.get(x, y) ? 0 : 255;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const i = ((y * scale + dy) * size + (x * scale + dx)) * 4;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
      }
    }
  }
  return { data, width: size, height: size };
}

test('jsQR decodes an Evenly join QR into a group invite', () => {
  const url = `https://evenly.lapardhaja.com/#/join/${TOKEN_G}`;
  const parsed = decodeInviteFromImageData(rasterizeQr(url));
  assert.deepEqual(parsed, { kind: 'group', token: TOKEN_G });
});

test('jsQR decodes an Evenly friend QR into an add-friend invite', () => {
  const url = `https://evenly.lapardhaja.com/app/#/add/${TOKEN_F}`;
  const parsed = decodeInviteFromImageData(rasterizeQr(url));
  assert.deepEqual(parsed, { kind: 'friend', token: TOKEN_F });
});

test('parseInviteFromText still pulls a token out of noisy camera text', () => {
  assert.deepEqual(parseInviteFromText(`see ${TOKEN_G} thanks`), {
    kind: 'group',
    token: TOKEN_G,
  });
});

test('ScanQrPage decodes with jsQR, not BarcodeDetector-only', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../pages/ScanQrPage.jsx'),
    'utf8',
  );
  assert.match(src, /decodeInviteFromVideo/);
  assert.match(src, /decodeInviteFromFile/);
  assert.doesNotMatch(src, /BarcodeDetector/);
});
