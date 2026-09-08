import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const FAB_OVERLAY_ROOT_ID = 'evenly-overlay-root';

/** Mount FABs outside the overflow-hidden app shell so iOS Safari cannot clip them. */
export default function FabPortal({ children }) {
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    setHost(document.getElementById(FAB_OVERLAY_ROOT_ID));
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
