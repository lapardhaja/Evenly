import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 56;
const MAX_PULL = 96;
const RESIST = 0.42;
/** Ignore pull until finger moved down this far (avoids fighting scroll / bounce). */
const PULL_ARM_PX = 18;
/** Cancel pull if horizontal movement dominates (lists, swipe rows). */
const HORIZONTAL_CANCEL_PX = 14;

/**
 * Pull down on the scroll container to refresh (mobile / touch).
 * Uses a non-passive touchmove listener so the pull gesture can be detected at scroll top.
 */
export function usePullToRefresh({ onRefresh, disabled = false, threshold = THRESHOLD }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullPx, setPullPx] = useState(0);
  const pullPxRef = useRef(0);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const trackingRef = useRef(false);
  const pullIntentRef = useRef(false);
  const refreshingRef = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const runRefresh = useCallback(async () => {
    if (disabled || refreshingRef.current) return;
    setRefreshing(true);
    refreshingRef.current = true;
    setPullPx(0);
    pullPxRef.current = 0;
    try {
      await onRefreshRef.current();
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }, [disabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return undefined;

    const onTouchStart = (e) => {
      if (el.scrollTop > 2) {
        trackingRef.current = false;
        pullIntentRef.current = false;
        return;
      }
      trackingRef.current = true;
      pullIntentRef.current = false;
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
    };

    const onTouchMove = (e) => {
      if (!trackingRef.current || refreshingRef.current) return;
      if (el.scrollTop > 2) {
        trackingRef.current = false;
        pullIntentRef.current = false;
        setPullPx(0);
        pullPxRef.current = 0;
        return;
      }
      const touch = e.touches[0];
      const dy = touch.clientY - startYRef.current;
      const dx = touch.clientX - startXRef.current;

      if (!pullIntentRef.current) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > HORIZONTAL_CANCEL_PX) {
          trackingRef.current = false;
          return;
        }
        if (dy < 4) {
          return;
        }
        if (dy < PULL_ARM_PX) {
          return;
        }
        pullIntentRef.current = true;
      }

      if (dy > 4) {
        e.preventDefault();
        const p = Math.min(dy * RESIST, MAX_PULL);
        pullPxRef.current = p;
        setPullPx(p);
      }
    };

    const onTouchEnd = () => {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      pullIntentRef.current = false;
      const p = pullPxRef.current;
      pullPxRef.current = 0;
      setPullPx(0);
      if (p >= threshold) {
        void runRefresh();
      }
    };

    const onTouchCancel = () => {
      trackingRef.current = false;
      pullIntentRef.current = false;
      pullPxRef.current = 0;
      setPullPx(0);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [disabled, threshold, runRefresh]);

  return {
    containerRef,
    refreshing,
    pullPx,
    /** Progress 0–1 while pulling (for a small indicator) */
    pullProgress: Math.min(pullPx / threshold, 1),
  };
}
