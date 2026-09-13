/** How long the found-QR box stays on screen before we redeem the invite. */
export const SCAN_LOCK_MS = 560;

export function cornersFromLocation(location) {
  const pts = [
    location?.topLeftCorner,
    location?.topRightCorner,
    location?.bottomRightCorner,
    location?.bottomLeftCorner,
  ];
  if (
    pts.some(
      (p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y),
    )
  ) {
    return null;
  }
  return pts.map((p) => ({ x: p.x, y: p.y }));
}

/** Map scan-canvas quad onto a letterboxed (object-fit: contain) viewfinder. */
export function mapQuadToDisplay(quad, srcW, srcH, destW, destH) {
  if (!quad?.length || !srcW || !srcH || !destW || !destH) return null;
  const scale = Math.min(destW / srcW, destH / srcH);
  const ox = (destW - srcW * scale) / 2;
  const oy = (destH - srcH * scale) / 2;
  return quad.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }));
}

export function quadToSvgPoints(quad) {
  if (!quad?.length) return '';
  return quad.map((p) => `${p.x},${p.y}`).join(' ');
}
