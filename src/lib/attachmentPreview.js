/** True for any image MIME, including HEIC/HEIF. Callers must handle img onError
 * (Chrome cannot decode HEIC; iOS Safari can). */
export function canPreviewAttachmentInline(mimeType) {
  return String(mimeType || '')
    .toLowerCase()
    .startsWith('image/');
}
