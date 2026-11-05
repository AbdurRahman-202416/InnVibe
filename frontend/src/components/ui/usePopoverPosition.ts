import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

interface Options {
  /** Height the popover would like to have; decides whether it opens below or above the trigger. */
  desiredHeight: number;
  /** The popover is at least this wide (it is otherwise as wide as the trigger). */
  minWidth?: number;
  /** Never taller than this, even when there is more room. */
  maxHeight?: number;
}

/** Where to put a popover (calendar, dropdown list) relative to its trigger button */
export function usePopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  { desiredHeight, minWidth = 0, maxHeight = Infinity }: Options,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!isOpen) return;

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 8; // gap to the screen edge
      const gap = 6; // gap to the trigger
      const roomBelow = window.innerHeight - rect.bottom - margin - gap;
      const roomAbove = rect.top - margin - gap;
      const placeBelow = roomBelow >= desiredHeight || roomBelow >= roomAbove;
      const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - margin * 2);
      const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);

      setStyle({
        position: 'fixed',
        left,
        width,
        maxHeight: Math.min(maxHeight, Math.max(160, placeBelow ? roomBelow : roomAbove)),
        overflowY: 'auto',
        ...(placeBelow ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }),
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true); // capture: also fires for scrolling inside the modal body
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [triggerRef, isOpen, desiredHeight, minWidth, maxHeight]);

  // Until the real position is known (the very first render), keep the popover invisible and pinned to the
  // top-left of the screen. Otherwise it sits at the end of <body>, and focusing it would scroll the whole page there.
  return style ?? { position: 'fixed', top: 0, left: 0, visibility: 'hidden' };
}
