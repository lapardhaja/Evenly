import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import { chatFillChildSx, pullToRefreshFillSx } from '../lib/appShell.js';

/**
 * Scrollable region with pull-down-to-refresh (touch). Keeps user on the same route.
 * `fill` — chat threads: lock the page to the content box so the composer docks to the bottom.
 */
export default function PullToRefreshLayout({
  onRefresh,
  disabled = false,
  fill = false,
  children,
}) {
  const { containerRef, refreshing, pullPx, pullProgress } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const barH = refreshing ? 44 : Math.min(pullPx * 0.55, 44);
  const showBar = pullPx > 4 || refreshing;

  return (
    <Box
      id="evenly-main-scroll"
      ref={containerRef}
      sx={
        fill
          ? pullToRefreshFillSx
          : {
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
            }
      }
    >
      {showBar ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: barH,
            overflow: 'hidden',
            pointerEvents: 'none',
            transition: refreshing ? undefined : 'height 0.1s ease-out',
          }}
        >
          <CircularProgress
            size={26}
            thickness={4}
            variant={refreshing ? 'indeterminate' : 'determinate'}
            value={refreshing ? undefined : Math.round(pullProgress * 100)}
            sx={{ opacity: refreshing || pullProgress > 0.12 ? 1 : 0.45 }}
          />
        </Box>
      ) : null}
      {fill ? <Box sx={chatFillChildSx}>{children}</Box> : children}
    </Box>
  );
}
