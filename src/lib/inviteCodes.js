const TOKEN_RE = /^[gf]_[a-f0-9]{32}$/;

function clientOrThrow() {
  // Deferred import: unit tests run under node:test without Vite's import.meta.env.
  return import('./supabaseClient.js').then(({ getSupabase, isSupabaseConfigured }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    return client;
  });
}

export function normalizeInviteToken(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function isInviteToken(raw) {
  return TOKEN_RE.test(normalizeInviteToken(raw));
}

export function invitePath(kind, token) {
  const segment = kind === 'friend' ? 'add' : 'join';
  return `/${segment}/${encodeURIComponent(normalizeInviteToken(token))}`;
}

export function inviteAbsoluteUrl(
  kind,
  token,
  loc = typeof window !== 'undefined' ? window.location : null,
) {
  const t = normalizeInviteToken(token);
  if (!loc || !t) return '';
  return `${loc.origin}${loc.pathname}#${invitePath(kind, t)}`;
}

export function parseInvitePathname(pathname) {
  const m = String(pathname || '').match(/^\/(join|add)\/([^/]+)\/?$/);
  if (!m) return null;
  const token = normalizeInviteToken(decodeURIComponent(m[2]));
  if (!isInviteToken(token)) return null;
  const kind = m[1] === 'add' ? 'friend' : 'group';
  if (kind === 'group' && !token.startsWith('g_')) return null;
  if (kind === 'friend' && !token.startsWith('f_')) return null;
  return { kind, token };
}

/** Camera apps and in-app scanners hand us a full URL, a hash path, or a raw token. */
export function parseInviteFromText(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const hash = text.match(/#\/(join|add)\/([A-Za-z0-9_-]+)/);
  if (hash) return parseInvitePathname(`/${hash[1]}/${hash[2]}`);
  const path = text.match(/(?:^|\/)(join|add)\/([A-Za-z0-9_-]+)/);
  if (path) return parseInvitePathname(`/${path[1]}/${path[2]}`);
  const token = normalizeInviteToken(text);
  if (!isInviteToken(token)) return null;
  return { kind: token.startsWith('g_') ? 'group' : 'friend', token };
}

export function friendlyInviteCodeError(raw) {
  const m = String(raw?.message || raw || '');
  const lower = m.toLowerCase();
  if (lower.includes('invite not found') || lower.includes('invalid code')) {
    return 'That QR or link isn’t valid. Ask them to show it again.';
  }
  if (lower.includes('own code')) return 'That’s your own code.';
  if (lower.includes('not a group member')) {
    return 'You have to be in this group to share its QR.';
  }
  if (lower.includes('not authenticated')) return 'Sign in again, then try that invite.';
  return m.trim() || 'Couldn’t use that invite.';
}

export async function ensureGroupJoinCode(groupId) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('ensure_group_join_code', {
    p_group_id: groupId,
  });
  if (error) throw new Error(friendlyInviteCodeError(error));
  return String(data || '');
}

export async function rotateGroupJoinCode(groupId) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('rotate_group_join_code', {
    p_group_id: groupId,
  });
  if (error) throw new Error(friendlyInviteCodeError(error));
  return String(data || '');
}

export async function joinGroupByCode(token) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('join_group_by_code', {
    p_token: normalizeInviteToken(token),
  });
  if (error) throw new Error(friendlyInviteCodeError(error));
  return data;
}

export async function ensureFriendCode() {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('ensure_friend_code');
  if (error) throw new Error(friendlyInviteCodeError(error));
  return String(data || '');
}

export async function addFriendByCode(token) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('add_friend_by_code', {
    p_token: normalizeInviteToken(token),
  });
  if (error) throw new Error(friendlyInviteCodeError(error));
  return data;
}

export async function peekInviteCode(token) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.rpc('peek_invite_code', {
    p_token: normalizeInviteToken(token),
  });
  if (error) throw new Error(friendlyInviteCodeError(error));
  return data;
}
