/** Pin the message list to the latest row without scrolling the page (`scrollIntoView` would). */
export function scrollChatToBottom(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/** True when the latest messages are already in view (or there is no scroller yet). */
export function isChatNearBottom(el, thresholdPx = 80) {
  if (!el) return true;
  const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
  return gap <= thresholdPx;
}

/**
 * Scroll now, then again after layout frames — flex height often isn't ready on the first paint.
 * @returns {() => void} cancel
 */
export function pinChatToLatestAfterLayout(el, schedule = (fn) => requestAnimationFrame(fn)) {
  if (!el) return () => {};
  scrollChatToBottom(el);
  const id1 = schedule(() => {
    scrollChatToBottom(el);
    schedule(() => scrollChatToBottom(el));
  });
  return () => {
    if (typeof cancelAnimationFrame === 'function' && typeof id1 === 'number') {
      cancelAnimationFrame(id1);
    }
  };
}
