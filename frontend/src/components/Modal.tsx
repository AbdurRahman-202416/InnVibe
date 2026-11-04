'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  /** Panel width on larger screens. Default is a compact dialog. */
  size?: 'md' | 'lg';
  children: ReactNode;
  /** Omit to make the modal impossible to dismiss (e.g. while a payment is processing). */
  onClose?: () => void;
}

/**
 * Small accessible modal used by the guest checkout (price details, cancellation policy, payment progress).
 *  - role="dialog" + aria-modal + aria-labelledby for screen readers
 *  - Escape key and backdrop click close it (when onClose is given)
 *  - page scroll is locked while it is open, and focus returns to the button that opened it
 *  - bottom sheet on phones, centred card on larger screens
 *  - rendered into document.body (a portal), so it always sits above sticky headers and
 *    sticky sidebars. Without this, a modal inside a sticky parent is trapped in that parent's stacking context.
 *    (A Modal is only ever mounted after a click, so `document` exists.)
 */
export default function Modal({ title, children, onClose, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`animate-modal-in max-h-[90vh] w-full overflow-y-auto border border-line bg-surface p-6 shadow-2xl outline-none ${size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md'} sm:p-8 rounded-t-lg sm:rounded-lg`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-2xl font-semibold text-ink">
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-muted hover:bg-paper hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
