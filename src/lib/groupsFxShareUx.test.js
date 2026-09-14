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
  const home = read('src/pages/HomePage.jsx');
  assert.match(home, /HomeBalancesCard/);
  assert.match(home, /useHomeBalances/);
  assert.match(home, /\/groups\/\$\{id\}\/settle/);
  assert.match(home, /Your groups/);
  const groups = read('src/pages/GroupsPage.jsx');
  assert.match(groups, /you're owed/);
  assert.doesNotMatch(groups, /HomeBalancesCard/);
  const card = read('src/components/HomeBalancesCard.jsx');
  assert.match(card, /You're owed/);
  assert.match(card, /You owe/);
  assert.match(card, /All settled/);
  assert.match(card, /Nobody owes anyone right now/);
  assert.doesNotMatch(card, /IOU/);
  assert.doesNotMatch(home, /IOU/);
});

test('app shell splits Home and Groups with a tab bar', () => {
  const router = read('src/router.jsx');
  assert.match(router, /HomePage/);
  assert.match(router, /SearchPage/);
  assert.match(router, /path: 'groups'/);
  assert.match(router, /path: 'search'/);
  assert.match(router, /path: 'friends'/);
  assert.match(router, /FriendsPage/);
  assert.doesNotMatch(router, /Navigate to="\/search"/);
  const layout = read('src/core/Layout.jsx');
  assert.match(layout, /AppTabBar/);
  assert.match(layout, /DesktopAppNav/);
  assert.match(layout, /flexDirection: 'row'/);
  assert.match(layout, /shouldShowDesktopNav/);
  assert.match(layout, /goTab/);
  assert.doesNotMatch(layout, /another device/);
  assert.match(layout, /setProperty\(\s*'--evenly-tab-bar-offset'/);
  assert.doesNotMatch(layout, /pathname === '\/profile' \|\| location.pathname === '\/friends'/);
  const fab = read('src/core/fabPlacement.js');
  assert.match(fab, /max\(56px/);
  const detail = read('src/pages/GroupDetailPage.jsx');
  assert.match(detail, /navigate\('\/groups'\)/);
  const tabs = read('src/components/AppTabBar.jsx');
  assert.match(tabs, /value="search"/);
  assert.match(tabs, /value="messages"/);
  assert.match(tabs, /value="profile"/);
  const desktopNav = read('src/components/DesktopAppNav.jsx');
  assert.match(desktopNav, /APP_TABS/);
  assert.match(desktopNav, /tab\.emoji/);
  assert.match(desktopNav, /aria-label="Primary"/);
  assert.match(desktopNav, /flexDirection: 'column'/);
  const shell = read('src/lib/appShell.js');
  assert.match(shell, /emoji: '🏠'/);
  assert.match(shell, /emoji: '🔍'/);
  assert.match(shell, /emoji: '👥'/);
  assert.match(shell, /emoji: '💬'/);
  assert.match(shell, /emoji: '👤'/);
  const search = read('src/pages/SearchPage.jsx');
  assert.match(search, /filterGroupsForSearch/);
  assert.match(search, /filterReceiptsForSearch/);
  assert.match(search, /searchPeople/);
  assert.match(search, /Scan QR/);
  assert.match(search, /filterGroupPeopleForSearch/);
  const inbox = read('src/pages/ChatInboxPage.jsx');
  assert.match(inbox, />\s*Messages\s*</);
  const friendsPage = read('src/pages/FriendsPage.jsx');
  assert.match(friendsPage, /removeFriend/);
  assert.match(friendsPage, /Remove friend\?/);
  const profile = read('src/pages/ProfilePage.jsx');
  assert.match(profile, /navigate\('\/friends'\)/);
  assert.match(profile, /color="error"/);
  assert.match(profile, /signOut\(\)/);
  assert.doesNotMatch(profile, /Evenly can’t send Venmo/);
  assert.doesNotMatch(profile, /Venmo app → Me/);
  assert.doesNotMatch(profile, /How you show up when friends search/);
  assert.match(tabs, /value="messages"/);
  assert.doesNotMatch(tabs, /showChat \?/);
});

test('subprocessors list dated FX hosts', () => {
  const src = read('src/lib/subprocessors.js');
  assert.match(src, /frankfurter\.dev/);
  assert.match(src, /2024-03-02/);
});
