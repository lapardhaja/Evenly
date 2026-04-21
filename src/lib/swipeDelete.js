const AUTO_CLOSE_GUARD_MS = 220;

export function getSwipeDeleteTranslateX(listElement) {
  if (!listElement) return 0;
  const t = listElement.style?.transform || '';
  const m = t.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  return m ? parseFloat(m[1], 10) : 0;
}

export function shouldCloseSwipeOnContentClick({
  translateXPx,
  lastSwipeEndAtMs,
  nowMs = Date.now(),
}) {
  if (!(translateXPx < -8)) return false;
  if (!Number.isFinite(lastSwipeEndAtMs)) return true;
  return nowMs - lastSwipeEndAtMs > AUTO_CLOSE_GUARD_MS;
}
