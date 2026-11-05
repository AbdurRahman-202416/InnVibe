'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  /** Panel width on larger screens. Default is a compact dialog. */
  size?: 'md' | 'lg';
  children: ReactNode;
  /** Optional fixed bar at the bottom (actions). It stays visible while the content scrolls. */
  footer?: ReactNode;
  /** Omit to make the modal impossible to dismiss (e.g. while a payment is processing). */
  onClose?: () => void;
}

/** Small accessible modal used by the guest checkout (price details, cancellation policy, payment progress) */
export default function Modal({ title, children, footer, onClose, size = 'md' }: ModalProps) {
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
        className={`animate-modal-in flex max-h-[90dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-2xl outline-none ${size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md'} rounded-t-lg sm:rounded-lg`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-7">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-surface px-6 py-4 sm:px-8">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
