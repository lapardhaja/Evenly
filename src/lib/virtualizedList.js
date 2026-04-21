export function getVirtualRowTranslateY(start, scrollMargin = 0) {
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeScrollMargin = Number.isFinite(scrollMargin) ? scrollMargin : 0;
  return Math.max(0, safeStart - safeScrollMargin);
}
