'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from './useDismiss';
import { usePopoverPosition } from './usePopoverPosition';

export interface SelectOption {
  value: string;
  label: string;
  /** Smaller, muted text shown after the label (e.g. a price). */
  hint?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Included in a normal HTML form submit. */
  name?: string;
  /** id of the visible label element, for screen readers. */
  labelledBy?: string;
}


/**
 * Custom dropdown (listbox) instead of the browser's native <select>, so it matches the site.
 * Keyboard: Arrow keys move, Home/End jump, Enter or Space picks, Escape closes.
 * The popover is exactly as wide as the trigger.
 */
export default function Select({ options, value, onChange, name, labelledBy }: SelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const triggerId = useId();

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismiss([wrapperRef, listRef], isOpen, close);
  const listStyle = usePopoverPosition(triggerRef, isOpen, { desiredHeight: 260, maxHeight: 256 });

  function open() {
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  }

  // Focus the list when it opens, and keep the highlighted option scrolled into view.
  useEffect(() => {
    if (isOpen) listRef.current?.focus({ preventScroll: true });
  }, [isOpen, listStyle.visibility]); // runs again once the list is positioned (it cannot take focus while hidden)
  useEffect(() => {
    if (isOpen) listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  function choose(index: number) {
    onChange(options[index].value);
    close();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(options.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }

  const selected = options[selectedIndex];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-surface px-3.5 text-left text-base font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-200 hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/25 aria-expanded:border-gold aria-expanded:ring-2 aria-expanded:ring-gold/25"
      >
        <span className="truncate">
          {selected?.label}
          {selected?.hint && <span className="ml-2 text-sm text-muted">{selected.hint}</span>}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-gold-ink transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <input type="hidden" name={name} value={value} suppressHydrationWarning />

      {isOpen &&
        createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={handleListKeyDown}
          style={listStyle}
          className="animate-modal-in z-[70] rounded-md border border-line bg-surface p-1 shadow-xl shadow-ink/15 outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded px-3 text-base normal-case tracking-normal transition-colors duration-100 ${
                  index === activeIndex ? 'bg-gold-soft' : ''
                } ${isSelected ? 'font-semibold text-ink' : 'text-ink'}`}
              >
                <span>
                  {option.label}
                  {option.hint && <span className="ml-2 text-sm font-normal text-muted">{option.hint}</span>}
                </span>
                {isSelected && (
                  <svg className="h-4 w-4 shrink-0 text-gold-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
