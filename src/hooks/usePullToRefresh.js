import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 56;
const MAX_PULL = 96;
const RESIST = 0.42;

/**
 * Pull down on the scroll container to refresh (mobile / touch).
 * Uses a non-passive touchmove listener so the pull gesture can be detected at scroll top.
 */
export function usePullToRefresh({ onRefresh, disabled = false, threshold = THRESHOLD }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullPx, setPullPx] = useState(0);
  const pullPxRef = useRef(0);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
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
      if (el.scrollTop > 2) return;
      trackingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (!trackingRef.current || refreshingRef.current) return;
      if (el.scrollTop > 2) {
        trackingRef.current = false;
        setPullPx(0);
        pullPxRef.current = 0;
        return;
      }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 6) {
        e.preventDefault();
        const p = Math.min(dy * RESIST, MAX_PULL);
        pullPxRef.current = p;
        setPullPx(p);
      }
    };

    const onTouchEnd = () => {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      const p = pullPxRef.current;
      pullPxRef.current = 0;
      setPullPx(0);
      if (p >= threshold) {
        void runRefresh();
      }
    };

    const onTouchCancel = () => {
      trackingRef.current = false;
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
