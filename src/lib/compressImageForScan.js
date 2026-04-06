/**
 * Downscale + JPEG-compress a data URL so the scan POST stays under Vercel's ~4.5MB body limit.
 */
const MAX_BODY_CHARS = 3_200_000; // base64 + JSON wrapper

function toJpegDataUrl(canvas, quality) {
  return canvas.toDataURL('image/jpeg', quality);
}

export function compressImageDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) {
          reject(new Error('Could not read image dimensions'));
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let maxEdge = 1800;
        let quality = 0.82;

        const drawScaled = () => {
          const scale = Math.min(1, maxEdge / Math.max(w, h));
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));
          canvas.width = tw;
          canvas.height = th;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, tw, th);
          ctx.drawImage(img, 0, 0, tw, th);
        };

        drawScaled();
        let out = toJpegDataUrl(canvas, quality);

        for (let i = 0; i < 16 && out.length > MAX_BODY_CHARS; i += 1) {
          if (quality > 0.5) {
            quality = Math.max(0.5, quality - 0.08);
          } else if (maxEdge > 720) {
            maxEdge = Math.round(maxEdge * 0.82);
            quality = 0.78;
            drawScaled();
          } else {
            maxEdge = Math.max(640, Math.round(maxEdge * 0.9));
            quality = Math.max(0.45, quality - 0.05);
            drawScaled();
          }
          out = toJpegDataUrl(canvas, quality);
        }

        if (out.length > MAX_BODY_CHARS) {
          reject(
            new Error(
              'Photo is still too large after compression. Try cropping the receipt or a lower camera resolution.',
            ),
          );
          return;
        }

        resolve(out);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not load image for compression'));
    img.src = dataUrl;
  });
}
