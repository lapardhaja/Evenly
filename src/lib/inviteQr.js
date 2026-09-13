import QRCode from 'qrcode';

export async function inviteQrDataUrl(url) {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return '';
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#ffffff' },
  });
}
