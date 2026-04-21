const AUTO_CLOSE_GUARD_MS = 220;

export const SWIPE_DELETE_ACTION_MIN_WIDTH_PX = 88;
export const SWIPE_DELETE_MAX_SWIPE_RATIO = 0.4;

export function getSwipeDeleteTranslateX(listElement) {
  if (!listElement) return 0;
  const t = listElement.style?.transform || '';
  const m = t.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  return m ? parseFloat(m[1], 10) : 0;
}

export function canSwipeDeleteStayOpen({
  rowWidthPx,
  actionWidthPx = SWIPE_DELETE_ACTION_MIN_WIDTH_PX,
  maxSwipeRatio = SWIPE_DELETE_MAX_SWIPE_RATIO,
}) {
  return rowWidthPx * maxSwipeRatio > actionWidthPx;
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

export function isSwipeDeleteMeaningfullyOpen(translateXPx) {
  return translateXPx < -8;
}
