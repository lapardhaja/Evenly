import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCAN_LOCK_MS,
  cornersFromLocation,
  mapQuadToDisplay,
  quadToSvgPoints,
} from './scanQrOverlay.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('cornersFromLocation keeps the four QR corners in winding order', () => {
  const quad = cornersFromLocation({
    topLeftCorner: { x: 10, y: 12 },
    topRightCorner: { x: 90, y: 8 },
    bottomRightCorner: { x: 94, y: 88 },
    bottomLeftCorner: { x: 6, y: 92 },
  });
  assert.deepEqual(quad, [
    { x: 10, y: 12 },
    { x: 90, y: 8 },
    { x: 94, y: 88 },
    { x: 6, y: 92 },
  ]);
});

test('cornersFromLocation is null when a corner is missing', () => {
  assert.equal(
    cornersFromLocation({
      topLeftCorner: { x: 0, y: 0 },
      topRightCorner: { x: 10, y: 0 },
      bottomRightCorner: { x: 10, y: 10 },
    }),
    null,
  );
});

test('mapQuadToDisplay contain-fits scan coords onto a taller viewfinder', () => {
  const mapped = mapQuadToDisplay(
    [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 },
    ],
    200,
    100,
    200,
    200,
  );
  assert.deepEqual(mapped, [
    { x: 0, y: 50 },
    { x: 200, y: 50 },
    { x: 200, y: 150 },
    { x: 0, y: 150 },
  ]);
});

test('quadToSvgPoints is an SVG polygon points string', () => {
  assert.equal(
    quadToSvgPoints([
      { x: 1.2, y: 3.8 },
      { x: 4, y: 5 },
    ]),
    '1.2,3.8 4,5',
  );
});

test('lock delay is long enough to see the box before navigate', () => {
  assert.ok(SCAN_LOCK_MS >= 400);
  assert.ok(SCAN_LOCK_MS <= 900);
});

test('Scan QR viewfinder hunts, boxes the code, then locks before load', () => {
  const page = readFileSync(join(root, 'src/pages/ScanQrPage.jsx'), 'utf8');
  const view = readFileSync(join(root, 'src/components/ScanQrViewfinder.jsx'), 'utf8');
  assert.match(page, /ScanQrViewfinder/);
  assert.match(page, /SCAN_LOCK_MS/);
  assert.match(page, /scanInviteFromVideo/);
  assert.match(page, /Got it/);
  assert.match(view, /hunting/);
  assert.match(view, /polygon/);
  assert.match(view, /viewBox/);
});
