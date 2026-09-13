import { compressImageDataUrl } from './compressImageForScan.js';

export const CHAT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_BUCKET = 'chat-attachments';
/** Short-lived object URLs for chat photos (private bucket). Refresh on view. */
export const CHAT_SIGNED_URL_TTL_SECONDS = 600;

export const ALLOWED_CHAT_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_CHAT_FILE_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/rtf',
  'text/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]);

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/aac': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-m4a': 'm4a',
};

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  wave: 'audio/wav',
};

export const ALLOWED_CHAT_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-m4a',
]);

export const CHAT_IMAGE_GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const CHAT_CAMERA_ACCEPT = 'image/*';

export const CHAT_ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.rtf',
].join(',');

export function extensionForChatImageMime(mime) {
  return MIME_TO_EXT[mime] || 'bin';
}

export function buildChatImageStoragePath(conversationId, messageId, mime) {
  const ext = extensionForChatImageMime(mime);
  return `${conversationId}/${messageId}.${ext}`;
}

export function sanitizeChatFileName(name) {
  const base = String(name || 'file').replace(/^.*[/\\]/, '');
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim();
  return cleaned.slice(0, 120) || 'file';
}

export function inferChatFileMime(file) {
  const reported = typeof file?.type === 'string' ? file.type.trim().toLowerCase() : '';
  if (reported && reported !== 'application/octet-stream') return reported;
  const name = typeof file?.name === 'string' ? file.name : '';
  const ext = name.split('.').pop()?.toLowerCase();
  return (ext && EXT_TO_MIME[ext]) || '';
}

export function classifyChatAttachment(file) {
  const mime = inferChatFileMime(file);
  if (ALLOWED_CHAT_IMAGE_MIME.has(mime)) return 'image';
  if (ALLOWED_CHAT_AUDIO_MIME.has(mime.split(';')[0])) return 'audio';
  if (ALLOWED_CHAT_FILE_MIME.has(mime)) return 'file';
  return '';
}

export function assertChatImageFile(file) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('Pick a photo to send.');
  }
  const mime = inferChatFileMime(file);
  if (!ALLOWED_CHAT_IMAGE_MIME.has(mime)) {
    throw new Error('Send a JPEG, PNG, WebP, or GIF.');
  }
  if (file.size <= 0) throw new Error('That photo is empty.');
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error('Photo is too large (max 8 MB).');
  }
}

export function assertChatFile(file) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('Pick a file to send.');
  }
  const mime = inferChatFileMime(file);
  if (!ALLOWED_CHAT_FILE_MIME.has(mime)) {
    throw new Error('Send a PDF, Office doc, text, or zip file.');
  }
  if (file.size <= 0) throw new Error('That file is empty.');
  if (file.size > CHAT_FILE_MAX_BYTES) {
    throw new Error('File is too large (max 10 MB).');
  }
}

export function assertChatAudioFile(file) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('Record a voice message first.');
  }
  const mime = inferChatFileMime(file).split(';')[0];
  if (!ALLOWED_CHAT_AUDIO_MIME.has(mime) && !String(file.type || '').startsWith('audio/')) {
    throw new Error('That voice note isn’t a supported audio type.');
  }
  if (file.size <= 0) throw new Error('That voice note is empty.');
  if (file.size > CHAT_FILE_MAX_BYTES) {
    throw new Error('Voice note is too large (max 10 MB).');
  }
}

export function formatChatByteSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function chatNonTextPreview(type) {
  if (type === 'image') return 'Sent a photo';
  if (type === 'file') return 'Sent a file';
  if (type === 'audio') return 'Sent a voice message';
  if (type === 'payment') return 'Payment request';
  return '';
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
  if (message?.type === 'file' || message?.type === 'audio' || message?.type === 'payment' || message?.type === 'text') {
    return false;
  }
  return message?.type === 'image' || Boolean(parseImagePayload(message?.payload));
}

export function parseFilePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const storagePath = typeof raw.storage_path === 'string' ? raw.storage_path.trim() : '';
  if (!storagePath) return null;
  const fileName = sanitizeChatFileName(raw.file_name || raw.filename || 'file');
  const mime = typeof raw.mime_type === 'string' ? raw.mime_type : 'application/octet-stream';
  return {
    storage_path: storagePath,
    mime_type: mime,
    file_name: fileName,
    byte_size: Number(raw.byte_size) || null,
  };
}

export function isFileMessage(message) {
  return message?.type === 'file';
}

export function parseAudioPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const storagePath = typeof raw.storage_path === 'string' ? raw.storage_path.trim() : '';
  if (!storagePath) return null;
  const duration = Number(raw.duration_ms);
  return {
    storage_path: storagePath,
    mime_type: typeof raw.mime_type === 'string' ? raw.mime_type : 'audio/webm',
    duration_ms: Number.isFinite(duration) && duration > 0 ? duration : null,
    byte_size: Number(raw.byte_size) || null,
  };
}

export function isAudioMessage(message) {
  return message?.type === 'audio';
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
  const mime = inferChatFileMime(file);
  if (mime === 'image/gif') {
    return { blob: file, mime: 'image/gif', width: null, height: null };
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Couldn’t read that photo.'));
    reader.readAsDataURL(file);
  });
  const compressed = await compressImageDataUrl(dataUrl);
  const { blob, mime: outMime } = dataUrlToBlob(compressed);
  return { blob, mime: outMime, width: null, height: null };
}
