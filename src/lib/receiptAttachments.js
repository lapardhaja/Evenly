import { v4 as uuidv4 } from 'uuid';

export const ATTACHMENT_MAX_BYTES = 10485760;
export const ATTACHMENT_MAX_PER_RECEIPT = 20;

export const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const BUCKET = 'receipt-attachments';
const SIGNED_URL_TTL_SECONDS = 120;

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
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

export function buildStoragePath(groupId, receiptId, attachmentId, mime) {
  const ext = extensionForMime(mime);
  return `${groupId}/${receiptId}/${attachmentId}.${ext}`;
}

export function assertAttachmentFile(file) {
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    throw new Error('Invalid attachment file');
  }
  if (!ALLOWED_ATTACHMENT_MIME.has(file.type)) {
    throw new Error(`Unsupported attachment type: ${file.type}`);
  }
  if (file.size <= 0) {
    throw new Error('Attachment file is empty');
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw new Error(`Attachment exceeds ${ATTACHMENT_MAX_BYTES} byte limit`);
  }
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
  assertAttachmentFile(file);

  const existing = await listAttachments(receiptId);
  if (existing.length >= ATTACHMENT_MAX_PER_RECEIPT) {
    throw new Error(`Maximum ${ATTACHMENT_MAX_PER_RECEIPT} attachments per receipt`);
  }

  const supabase = await clientOrThrow();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not signed in');

  const id = uuidv4();
  const path = buildStoragePath(groupId, receiptId, id, file.type);
  const storage = supabase.storage.from(BUCKET);

  const { error: uploadError } = await storage.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const row = {
    id,
    receipt_id: receiptId,
    group_id: groupId,
    storage_path: path,
    mime_type: file.type,
    file_name: file.name || 'attachment',
    byte_size: file.size,
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
