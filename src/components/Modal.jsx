import { useEffect } from 'react';

/**
 * Rece-style modal overlay (no <dialog> quirks).
 */
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="rece-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="rece-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'rece-modal-h' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2 id="rece-modal-h" className="rece-modal-title">
            {title}
          </h2>
        ) : null}
        <div className="rece-modal-body">{children}</div>
        {footer ? <div className="rece-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
