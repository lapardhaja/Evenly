import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFriendGraph, profileDisplayName } from './friendGraph.js';

test('buildFriendGraph maps request counterparties to display names', () => {
  const incoming = [{ id: 'r1', from_user_id: 'a' }];
  const outgoing = [{ id: 'r2', to_user_id: 'b' }];
  const friends = [{ user_id: 'c', first_name: 'Pat', last_name: 'Lee' }];
  const g = buildFriendGraph(incoming, outgoing, friends, [
    { user_id: 'a', first_name: 'Ada', last_name: 'Lovelace' },
    { user_id: 'b', username: 'bob' },
  ]);
  assert.equal(g.incoming, incoming);
  assert.equal(g.outgoing, outgoing);
  assert.equal(g.friends, friends);
  assert.equal(g.nameById.a, 'Ada Lovelace');
  assert.equal(g.nameById.b, 'bob');
  assert.equal(g.nameById.c, undefined);
  assert.equal(profileDisplayName(friends[0]), 'Pat Lee');
});

test('Friends and Search share fetchFriendGraph instead of copying list* calls', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const friendsPage = readFileSync(join(root, 'src/pages/FriendsPage.jsx'), 'utf8');
  const searchPage = readFileSync(join(root, 'src/pages/SearchPage.jsx'), 'utf8');
  const hook = readFileSync(join(root, 'src/hooks/useFriendGraph.js'), 'utf8');
  const api = readFileSync(join(root, 'src/lib/friendsApi.js'), 'utf8');
  assert.match(api, /export async function fetchFriendGraph/);
  assert.match(hook, /fetchFriendGraph/);
  assert.match(hook, /silent: true/);
  assert.match(friendsPage, /useFriendGraph/);
  assert.match(searchPage, /useFriendGraph/);
  assert.doesNotMatch(friendsPage, /await loadAll\(\)/);
  assert.doesNotMatch(searchPage, /await loadSocial\(\)/);
  assert.doesNotMatch(friendsPage, /listIncomingRequests/);
  assert.doesNotMatch(searchPage, /listIncomingRequests/);
});

test('profile gate uses auth.profile instead of refetching on every route', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const gate = readFileSync(join(root, 'src/hooks/useProfileGate.js'), 'utf8');
  const profile = readFileSync(join(root, 'src/pages/ProfilePage.jsx'), 'utf8');
  const auth = readFileSync(join(root, 'src/context/AuthContext.jsx'), 'utf8');
  assert.match(auth, /profileReady/);
  assert.match(gate, /profileReady/);
  assert.doesNotMatch(gate, /fetchMyProfile/);
  assert.match(profile, /profileReady/);
  assert.doesNotMatch(profile, /setLoading\(true\)/);
});
