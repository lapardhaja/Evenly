import { parseImagePayload } from '../../src/lib/chatMedia.js';

export const DELETE_ACCOUNT_CONFIRM = 'DELETE';

export function assertDeleteAccountRequest(body) {
  const confirm = typeof body?.confirm === 'string' ? body.confirm.trim() : '';
  if (confirm !== DELETE_ACCOUNT_CONFIRM) {
    return { ok: false, status: 400, error: 'Confirmation required' };
  }
  return { ok: true };
}

export function collectChatImagePaths(messages) {
  const paths = [];
  for (const row of messages || []) {
    const parsed = parseImagePayload(row?.payload);
    if (parsed?.storage_path) paths.push(parsed.storage_path);
  }
  return paths;
}

export function chunkPaths(paths, size = 100) {
  const out = [];
  for (let i = 0; i < paths.length; i += size) {
    out.push(paths.slice(i, i + size));
  }
  return out;
}

/**
 * Collect storage paths, delete the Auth user (cascades Postgres), then remove
 * orphaned private objects. Delete user first so a storage failure cannot wipe
 * files while the account still exists.
 */
export async function deleteAccountWithAdmin(admin, userId) {
  const { data: ownedGroups } = await admin.from('groups').select('id').eq('user_id', userId);
  const groupIds = (ownedGroups || []).map((g) => g.id).filter(Boolean);

  let receiptPaths = [];
  if (groupIds.length > 0) {
    const { data: atts } = await admin
      .from('receipt_attachments')
      .select('storage_path')
      .in('group_id', groupIds);
    receiptPaths = (atts || []).map((r) => r.storage_path).filter(Boolean);
  }

  const { data: images } = await admin
    .from('messages')
    .select('payload')
    .eq('sender_id', userId)
    .eq('type', 'image');
  const chatPaths = collectChatImagePaths(images);

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    throw new Error('delete_failed');
  }

  for (const batch of chunkPaths(receiptPaths)) {
    if (batch.length) await admin.storage.from('receipt-attachments').remove(batch);
  }
  for (const batch of chunkPaths(chatPaths)) {
    if (batch.length) await admin.storage.from('chat-attachments').remove(batch);
  }
}
