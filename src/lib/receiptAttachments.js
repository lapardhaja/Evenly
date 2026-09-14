import { v4 as uuidv4 } from 'uuid';
import { compressImageDataUrl } from './compressImageForScan.js';

export const ATTACHMENT_MAX_BYTES = 10485760;
export const ATTACHMENT_MAX_PER_RECEIPT = 20;
/** Minted URL lifetime. UI refreshes before this so thumbs don't 403 mid-view. */
export const SIGNED_URL_TTL_SECONDS = 120;
export const SIGNED_URL_REFRESH_MS = 90_000;

export const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const BUCKET = 'receipt-attachments';

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

function clientOrThrow() {
  // Deferred import: pure-helper unit tests run under node:test without Vite's import.meta.env.
  return import('./supabaseClient.js').then(({ getSupabase, isSupabaseConfigured }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    return client;
  });
}

export function extensionForMime(mime) {
  return MIME_TO_EXT[mime] ?? 'bin';
}

export function inferAttachmentMime(file) {
  const reported = typeof file?.type === 'string' ? file.type.trim().toLowerCase() : '';
  if (reported && reported !== 'application/octet-stream') return reported;
  const name = typeof file?.name === 'string' ? file.name : '';
  const ext = name.split('.').pop()?.toLowerCase();
  return (ext && EXT_TO_MIME[ext]) || '';
}

export function buildStoragePath(groupId, receiptId, attachmentId, mime) {
  const ext = extensionForMime(mime);
  return `${groupId}/${receiptId}/${attachmentId}.${ext}`;
}

export function assertAttachmentFile(file) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('Invalid attachment file');
  }
  const mime = inferAttachmentMime(file);
  if (!ALLOWED_ATTACHMENT_MIME.has(mime)) {
    throw new Error(`Unsupported attachment type: ${file.type || mime || 'unknown'}`);
  }
  if (file.size <= 0) {
    throw new Error('Attachment file is empty');
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw new Error(`Attachment exceeds ${ATTACHMENT_MAX_BYTES} byte limit`);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Couldn’t read that photo.'));
    reader.readAsDataURL(file);
  });
}

function jpegFileFromDataUrl(dataUrl, name) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Could not convert that photo.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const base = String(name || 'attachment').replace(/\.[^.]+$/, '');
  return new File([bytes], `${base || 'attachment'}.jpg`, { type: 'image/jpeg' });
}

/** iOS Photos often sends HEIC (or octet-stream + .heic). Store JPEG so every browser can preview. */
export async function prepareReceiptUploadFile(file) {
  const mime = inferAttachmentMime(file);
  let next = file;
  if (file && mime && file.type !== mime && typeof File !== 'undefined') {
    next = new File([file], file.name || 'attachment', { type: mime });
  }
  if (mime !== 'image/heic' && mime !== 'image/heif') return next;
  const dataUrl = await readFileAsDataUrl(next);
  const jpegUrl = await compressImageDataUrl(dataUrl);
  return jpegFileFromDataUrl(jpegUrl, next.name);
}

export async function listAttachments(receiptId) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase
    .from('receipt_attachments')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function uploadAttachment({ groupId, receiptId, file }) {
  const prepared = await prepareReceiptUploadFile(file);
  assertAttachmentFile(prepared);
  const mime = inferAttachmentMime(prepared);

  const existing = await listAttachments(receiptId);
  if (existing.length >= ATTACHMENT_MAX_PER_RECEIPT) {
    throw new Error(`Maximum ${ATTACHMENT_MAX_PER_RECEIPT} attachments per receipt`);
  }

  const supabase = await clientOrThrow();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not signed in');

  const id = uuidv4();
  const path = buildStoragePath(groupId, receiptId, id, mime);
  const storage = supabase.storage.from(BUCKET);

  const { error: uploadError } = await storage.upload(path, prepared, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const row = {
    id,
    receipt_id: receiptId,
    group_id: groupId,
    storage_path: path,
    mime_type: mime,
    file_name: prepared.name || file.name || 'attachment',
    byte_size: prepared.size,
    uploaded_by: userId,
  };

  const { data, error: insertError } = await supabase
    .from('receipt_attachments')
    .insert(row)
    .select()
    .single();

  if (insertError) {
    await storage.remove([path]);
    throw insertError;
  }

  return data;
}

export async function deleteAttachment(row) {
  const supabase = await clientOrThrow();
  const path = row?.storage_path;
  if (!path) throw new Error('Attachment row missing storage_path');

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from('receipt_attachments')
    .delete()
    .eq('id', row.id);
  if (error) throw error;
}

export async function getAttachmentSignedUrl(path) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
