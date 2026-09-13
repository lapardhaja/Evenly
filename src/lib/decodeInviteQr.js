import jsQR from 'jsqr';
import { parseInviteFromText } from './inviteCodes.js';

const SCAN_MAX_WIDTH = 640;

export function decodeQrTextFromRgba(data, width, height) {
  if (!data || !width || !height) return '';
  const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return code?.data ? String(code.data).trim() : '';
}

export function decodeInviteFromImageData(imageData) {
  if (!imageData?.data || !imageData.width || !imageData.height) return null;
  const text = decodeQrTextFromRgba(imageData.data, imageData.width, imageData.height);
  return parseInviteFromText(text);
}

export function drawVideoFrame(video, canvas) {
  const vw = video?.videoWidth || 0;
  const vh = video?.videoHeight || 0;
  if (!vw || !vh || !canvas) return null;
  const width = vw > SCAN_MAX_WIDTH ? SCAN_MAX_WIDTH : vw;
  const height = Math.max(1, Math.round((vh * width) / vw));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function decodeInviteFromVideo(video, canvas) {
  return decodeInviteFromImageData(drawVideoFrame(video, canvas));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Couldn’t read that photo.'));
    img.src = url;
  });
}

export async function decodeInviteFromFile(file) {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;
    const max = SCAN_MAX_WIDTH;
    const w = width > max ? max : width;
    const h = Math.max(1, Math.round((height * w) / width));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return decodeInviteFromImageData(ctx.getImageData(0, 0, w, h));
  } finally {
    URL.revokeObjectURL(url);
  }
}
