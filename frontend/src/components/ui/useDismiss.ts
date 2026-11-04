import { useEffect, type RefObject } from 'react';

/**
 * Close a popover when the user clicks outside it (and its trigger) or presses Escape.
 * Pass every element that counts as "inside": the trigger wrapper and the popover itself,
 * which lives in a portal and is therefore not a DOM child of the wrapper.
 * Escape is caught in the capture phase and stopped, so if the popover sits inside a Modal,
 * Escape closes only the popover and not the whole modal.
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  isOpen: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const inside = [refs].flat().some((ref) => ref.current?.contains(event.target as Node));
      if (!inside) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [refs, isOpen, onDismiss]);
}
