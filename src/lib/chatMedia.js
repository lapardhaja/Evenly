import { compressImageDataUrl } from './compressImageForScan.js';

export const CHAT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const CHAT_IMAGE_BUCKET = 'chat-attachments';
export const CHAT_SIGNED_URL_TTL_SECONDS = 3600;

export const ALLOWED_CHAT_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function extensionForChatImageMime(mime) {
  return MIME_TO_EXT[mime] || 'jpg';
}

export function buildChatImageStoragePath(conversationId, messageId, mime) {
  const ext = extensionForChatImageMime(mime);
  return `${conversationId}/${messageId}.${ext}`;
}

export function assertChatImageFile(file) {
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    throw new Error('Pick a photo to send.');
  }
  if (!ALLOWED_CHAT_IMAGE_MIME.has(file.type)) {
    throw new Error('Send a JPEG, PNG, WebP, or GIF.');
  }
  if (file.size <= 0) throw new Error('That photo is empty.');
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error('Photo is too large (max 8 MB).');
  }
}

export function parseImagePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const storagePath = typeof raw.storage_path === 'string' ? raw.storage_path.trim() : '';
  if (!storagePath) return null;
  const mime = typeof raw.mime_type === 'string' ? raw.mime_type : 'image/jpeg';
  const width = Number(raw.width);
  const height = Number(raw.height);
  return {
    storage_path: storagePath,
    mime_type: mime,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    byte_size: Number(raw.byte_size) || null,
  };
}

export function isImageMessage(message) {
  return message?.type === 'image' || Boolean(parseImagePayload(message?.payload));
}

export function summarizeLikes(rows, myUserId) {
  const byMessage = new Map();
  for (const row of rows || []) {
    const id = row?.message_id;
    if (!id) continue;
    const prev = byMessage.get(id) || { count: 0, mine: false };
    prev.count += 1;
    if (row.user_id === myUserId) prev.mine = true;
    byMessage.set(id, prev);
  }
  return byMessage;
}

export function toggleLikeState(map, messageId, myUserId, liked) {
  const next = new Map(map);
  const prev = next.get(messageId) || { count: 0, mine: false };
  if (liked && !prev.mine) {
    next.set(messageId, { count: prev.count + 1, mine: true });
  } else if (!liked && prev.mine) {
    const count = Math.max(0, prev.count - 1);
    if (count === 0) next.delete(messageId);
    else next.set(messageId, { count, mine: false });
  }
  return next;
}

export function applyLikeRealtime(map, payload, myUserId, knownIds) {
  const event = payload?.eventType;
  const row = event === 'DELETE' ? payload?.old : payload?.new;
  const messageId = row?.message_id;
  if (!messageId || (knownIds && !knownIds.has(messageId))) return map;
  if (event === 'INSERT') {
    const prev = map.get(messageId) || { count: 0, mine: false };
    if (row.user_id === myUserId && prev.mine) return map;
    const next = new Map(map);
    next.set(messageId, {
      count: prev.count + 1,
      mine: prev.mine || row.user_id === myUserId,
    });
    return next;
  }
  if (event === 'DELETE') {
    const prev = map.get(messageId);
    if (!prev) return map;
    if (row.user_id === myUserId && !prev.mine) return map;
    const next = new Map(map);
    const count = Math.max(0, prev.count - 1);
    const mine = row.user_id === myUserId ? false : prev.mine;
    if (count === 0) next.delete(messageId);
    else next.set(messageId, { count, mine });
    return next;
  }
  return map;
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(',');
  const mime = /data:([^;]+)/.exec(parts[0] || '')?.[1] || 'image/jpeg';
  const bin = atob(parts[1] || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

export async function fileToChatImageBlob(file) {
  assertChatImageFile(file);
  if (file.type === 'image/gif') {
    return { blob: file, mime: 'image/gif', width: null, height: null };
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Couldn’t read that photo.'));
    reader.readAsDataURL(file);
  });
  const compressed = await compressImageDataUrl(dataUrl);
  const { blob, mime } = dataUrlToBlob(compressed);
  return { blob, mime, width: null, height: null };
}
