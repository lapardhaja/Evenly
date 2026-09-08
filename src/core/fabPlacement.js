/**
 * Fixed FAB / SpeedDial position — sits above home indicator + comfortable margin.
 * xs is slightly above iOS Chrome’s bottom toolbar without covering mid-list rows.
 * Legal footer is in-flow (not locked chrome); do not add extra footer offset here.
 */
export const fabFixedPlacementSx = {
  position: 'fixed',
  zIndex: (theme) => theme.zIndex.speedDial,
  bottom: {
    xs: 'calc(56px + env(safe-area-inset-bottom, 0px) + var(--evenly-cookie-banner-offset, 0px))',
    sm: 'calc(64px + env(safe-area-inset-bottom, 0px) + var(--evenly-cookie-banner-offset, 0px))',
  },
  right: {
    xs: 'calc(20px + env(safe-area-inset-right, 0px))',
    sm: 'calc(28px + env(safe-area-inset-right, 0px))',
  },
};

/**
 * In-flow spacer so the last list row can scroll fully above the fixed FAB.
 * FAB (~56px) + bottom offset (56–64px) + gap, plus safe-area.
 */
export const fabScrollClearanceSx = {
  pb: {
    xs: 'calc(120px + env(safe-area-inset-bottom, 0px))',
    sm: 'calc(132px + env(safe-area-inset-bottom, 0px))',
  },
};
