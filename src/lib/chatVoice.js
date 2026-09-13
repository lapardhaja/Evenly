export const CHAT_AUDIO_MAX_MS = 60_000;
export const CHAT_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_AUDIO_MIN_MS = 400;

/** Prefer mp4/aac so iPhone can play the file. Chrome webm is silent on iOS `<audio>`. */
const RECORDER_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/aac',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/webm',
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

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/** 16-bit mono PCM WAV. Plays in iOS/Android `<audio>` without a MediaRecorder container. */
export function encodeWavPcm16(float32, sampleRate) {
  const rate = Math.round(Number(sampleRate) || 16000);
  const samples = float32 || new Float32Array(0);
  const bytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return buffer;
}

export function wavFileFromSamples(float32, sampleRate) {
  const buf = encodeWavPcm16(float32, sampleRate);
  return new File([buf], 'voice.wav', { type: 'audio/wav' });
}

function mergeFloat32(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

async function startWavSession(stream, ctx) {
  if (ctx.state === 'suspended') await ctx.resume();
  const sampleRate = ctx.sampleRate || 44100;
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0.0001;
  const chunks = [];
  const maxSamples = Math.floor((sampleRate * CHAT_AUDIO_MAX_MS) / 1000);
  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  let stopped = false;
  const finish = async (keep) => {
    if (stopped) return null;
    stopped = true;
    try {
      processor.disconnect();
    } catch {
      /* ignore */
    }
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
    try {
      mute.disconnect();
    } catch {
      /* ignore */
    }
    stopTracks(stream);
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    if (!keep || !chunks.length) return null;
    const merged = mergeFloat32(chunks);
    const minSamples = Math.floor((sampleRate * CHAT_AUDIO_MIN_MS) / 1000);
    if (merged.length < minSamples) return null;
    const trimmed = merged.length > maxSamples ? merged.subarray(0, maxSamples) : merged;
    return {
      file: wavFileFromSamples(trimmed, sampleRate),
      durationMs: Math.round((trimmed.length / sampleRate) * 1000),
    };
  };

  return {
    stop: () => finish(true),
    cancel: () => finish(false),
  };
}

function startMediaRecorderSession(stream) {
  const mime = pickRecorderMimeType();
  if (!mime || typeof MediaRecorder === 'undefined') {
    stopTracks(stream);
    throw new Error('Voice notes aren’t supported in this browser.');
  }
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const startedAt = Date.now();
  // No timeslice: Safari often produces a corrupt/unplayable blob when start(ms) is used.
  recorder.start();

  let stopped = false;
  const finish = (keep) =>
    new Promise((resolve) => {
      if (stopped) {
        resolve(null);
        return;
      }
      stopped = true;
      const done = () => {
        stopTracks(stream);
        if (!keep || !chunks.length) {
          resolve(null);
          return;
        }
        const file = audioFileFromChunks(chunks, recorder.mimeType || mime);
        if (file.size < 64) {
          resolve(null);
          return;
        }
        resolve({ file, durationMs: Date.now() - startedAt });
      };
      if (recorder.state === 'inactive') {
        done();
        return;
      }
      recorder.onstop = done;
      try {
        recorder.stop();
      } catch {
        done();
      }
    });

  return {
    stop: () => finish(true),
    cancel: () => finish(false),
  };
}

/**
 * Capture a voice note. Prefers WAV via Web Audio (plays on every phone).
 * Falls back to MediaRecorder without a timeslice.
 */
export async function startVoiceCapture() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Voice notes aren’t supported in this browser.');
  }
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = null;
  if (typeof Ctx === 'function') {
    try {
      ctx = new Ctx();
    } catch {
      ctx = null;
    }
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
  } catch {
    try {
      await ctx?.close?.();
    } catch {
      /* ignore */
    }
    throw new Error('Microphone permission is needed for voice notes.');
  }
  if (ctx) {
    try {
      return await startWavSession(stream, ctx);
    } catch {
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
    }
  }
  return startMediaRecorderSession(stream);
}
