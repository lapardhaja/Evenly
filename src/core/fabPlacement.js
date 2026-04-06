/**
 * Fixed FAB / SpeedDial position — sits above home indicator + comfortable margin.
 */
export const fabFixedPlacementSx = {
  position: 'fixed',
  bottom: {
    xs: 'calc(52px + env(safe-area-inset-bottom, 0px))',
    sm: 'calc(64px + env(safe-area-inset-bottom, 0px))',
  },
  right: {
    xs: 'calc(20px + env(safe-area-inset-right, 0px))',
    sm: 'calc(28px + env(safe-area-inset-right, 0px))',
  },
};
