import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  friendlyInviteCodeError,
  inviteAbsoluteUrl,
  invitePath,
  isInviteToken,
  parseInviteFromText,
  parseInvitePathname,
} from './inviteCodes.js';

const TOKEN_G = `g_${'ab'.repeat(16)}`;
const TOKEN_F = `f_${'cd'.repeat(16)}`;

test('invitePath and inviteAbsoluteUrl match the hash-router share pattern', () => {
  assert.equal(invitePath('group', TOKEN_G), `/join/${TOKEN_G}`);
  assert.equal(invitePath('friend', TOKEN_F), `/add/${TOKEN_F}`);
  const prev = globalThis.window;
  globalThis.window = { location: { origin: 'https://app.example', pathname: '/evenly/' } };
  try {
    assert.equal(
      inviteAbsoluteUrl('group', TOKEN_G),
      `https://app.example/evenly/#/join/${TOKEN_G}`,
    );
    assert.equal(
      inviteAbsoluteUrl('friend', TOKEN_F, { origin: 'https://evenly.test', pathname: '/' }),
      `https://evenly.test/#/add/${TOKEN_F}`,
    );
  } finally {
    globalThis.window = prev;
  }
});

test('parseInviteFromText accepts camera-app URLs, hash paths, and raw tokens', () => {
  assert.deepEqual(parseInviteFromText(`https://evenly.lapardhaja.com/#/join/${TOKEN_G}`), {
    kind: 'group',
    token: TOKEN_G,
  });
  assert.deepEqual(parseInviteFromText(`#/add/${TOKEN_F}`), { kind: 'friend', token: TOKEN_F });
  assert.deepEqual(parseInviteFromText(TOKEN_G.toUpperCase()), { kind: 'group', token: TOKEN_G });
  assert.equal(parseInviteFromText('not-a-code'), null);
  assert.equal(parseInvitePathname(`/join/${TOKEN_F}`), null);
  assert.equal(isInviteToken('g_short'), false);
});

test('friendlyInviteCodeError does not dump RPC jargon', () => {
  assert.match(friendlyInviteCodeError('Invite not found'), /QR or link/i);
  assert.match(friendlyInviteCodeError('That’s your own code'), /own code/i);
  assert.equal(/invite not found/i.test(friendlyInviteCodeError('Invite not found')), false);
});

test('stripped UUID is 32 hex and matches invite token format', () => {
  const hex = '550e8400-e29b-41d4-a716-446655440000'.replaceAll('-', '');
  assert.equal(hex.length, 32);
  assert.equal(isInviteToken(`g_${hex}`), true);
  assert.equal(isInviteToken(`f_${hex}`), true);
});

test('QR token RPCs use gen_random_uuid, not pgcrypto gen_random_bytes', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations');
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
  for (const name of ['ensure_group_join_code', 'rotate_group_join_code', 'ensure_friend_code']) {
    const start = sql.lastIndexOf(`create or replace function public.${name}`);
    assert.ok(start >= 0, name);
    const end = sql.indexOf('$$;', start);
    const body = sql.slice(start, end === -1 ? undefined : end);
    assert.doesNotMatch(body, /gen_random_bytes/);
    assert.match(body, /replace\(gen_random_uuid\(\)::text, '-', ''\)/);
  }
});

test('join-by-code SQL does not require friendships; add_friend_to_group still does', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260913020000_qr_invites.sql'),
    'utf8',
  );
  const joinFn = sql.slice(sql.indexOf('join_group_by_code'), sql.indexOf('add_friend_by_code'));
  assert.match(joinFn, /insert into public.group_members/);
  assert.equal(/from public.friendships/i.test(joinFn), false);
  assert.match(sql, /add_friend_by_code/);
  assert.match(sql, /friend_invite_codes/);
  assert.match(sql, /group_join_codes/);
});
