export const CHAT_AUDIO_MAX_MS = 60_000;
export const CHAT_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_AUDIO_MIN_MS = 400;

const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
];

export function pickRecorderMimeType(Recorder = globalThis.MediaRecorder) {
  if (!Recorder || typeof Recorder.isTypeSupported !== 'function') return '';
  return RECORDER_MIME_CANDIDATES.find((t) => Recorder.isTypeSupported(t)) || '';
}

export function extensionForAudioMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  return 'webm';
}

export function formatVoiceClock(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function audioFileFromChunks(chunks, mime) {
  const type = String(mime || 'audio/webm').split(';')[0] || 'audio/webm';
  const blob = new Blob(chunks, { type });
  const ext = extensionForAudioMime(type);
  return new File([blob], `voice.${ext}`, { type });
}
