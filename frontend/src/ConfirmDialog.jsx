import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}) {
  const id = useId();
  const container = useRef(null);
  const cancel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    const outside = [...document.body.children].filter(
      (element) => !element.contains(container.current),
    );
    const states = outside.map((element) => ({
      element,
      inert: element.getAttribute('inert'),
      hidden: element.getAttribute('aria-hidden'),
    }));
    outside.forEach((element) => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      states.forEach(({ element, inert, hidden }) => {
        inert === null ? element.removeAttribute('inert') : element.setAttribute('inert', inert);
        hidden === null
          ? element.removeAttribute('aria-hidden')
          : element.setAttribute('aria-hidden', hidden);
      });
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={container}
        className="confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Tab') {
            const nodes = container.current.querySelectorAll(
              'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
            );
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="confirmation-heading">
          <span className="eyebrow">EXPLICIT OPERATOR CONFIRMATION</span>
          <button
            aria-label="Close confirmation"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id={id}>{title}</h2>
        <div className="confirmation-copy">{children}</div>
        <div className="confirmation-buttons">
          <button ref={cancel} className="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
