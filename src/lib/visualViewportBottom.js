/**
 * Gap between the layout viewport and the visible visual viewport (Safari/Chrome toolbars, keyboard).
 */
export function visualViewportBottomGap({ innerHeight, height, offsetTop }) {
  const h = Number(innerHeight) || 0;
  const vh = Number(height) || 0;
  const top = Number(offsetTop) || 0;
  return Math.max(0, Math.round(h - vh - top));
}
