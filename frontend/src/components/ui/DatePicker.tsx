'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { addDays, formatDate, todayIso } from '@/lib/format';
import { useDismiss } from './useDismiss';
import { usePopoverPosition } from './usePopoverPosition';

interface DatePickerProps {
  /** Selected date as "YYYY-MM-DD" (empty string = nothing chosen yet). */
  value: string;
  onChange: (isoDate: string) => void;
  /** Earliest / latest selectable date, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** Included in a normal HTML form submit (e.g. the GET search form). */
  name?: string;
  required?: boolean;
  placeholder?: string;
  /** id of the visible label element, for screen readers. */
  labelledBy?: string;
  /** Shows the red error styling (the message itself is rendered by the parent). */
  invalid?: boolean;
  /** id of the element that holds the error message. */
  describedBy?: string;
  /** id for the trigger button, so a parent can move focus to it. */
  triggerId?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const parseIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: month - 1, day };
};
/** Custom date picker instead of the browser's native one */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  name,
  required,
  placeholder = 'Select date',
  labelledBy,
  invalid,
  describedBy,
  triggerId: triggerIdProp,
}: DatePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const generatedId = useId();
  const triggerId = triggerIdProp ?? generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<{ year: number; month: number }>(() => parseIso(value || min || todayIso()));
  const [focusedIso, setFocusedIso] = useState(value || min || todayIso());

  const today = todayIso();
  const isDisabled = useCallback(
    (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max),
    [min, max],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismiss([wrapperRef, popoverRef], isOpen, close);
  const popoverStyle = usePopoverPosition(triggerRef, isOpen, { desiredHeight: 370, minWidth: 280 });

  function open() {
    const start = value || min || today;
    setView(parseIso(start));
    setFocusedIso(start);
    setIsOpen(true);
  }

  // Move keyboard focus onto the focused day whenever the popover is open and it changes.
  useEffect(() => {
    if (!isOpen) return;
    popoverRef.current?.querySelector<HTMLButtonElement>(`button[data-iso="${focusedIso}"]`)?.focus({ preventScroll: true });
  }, [isOpen, focusedIso, view, popoverStyle.visibility]); // also runs once the popover is positioned (it cannot take focus while hidden)

  function moveFocus(next: string) {
    if (isDisabled(next)) return;
    const { year, month } = parseIso(next);
    setView({ year, month });
    setFocusedIso(next);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in steps) {
      event.preventDefault();
      moveFocus(addDays(focusedIso, steps[event.key]));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const { year, month, day } = parseIso(focusedIso);
      const target = new Date(Date.UTC(year, month + (event.key === 'PageUp' ? -1 : 1), 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      moveFocus(toIso(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
    }
  }

  function shiftMonth(delta: number) {
    const target = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: target.getUTCFullYear(), month: target.getUTCMonth() });
  }

  // Build the grid for the month being viewed: blanks before day 1, then every day.
  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthTitle = new Date(Date.UTC(view.year, view.month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const lastDayOfPrevMonth = new Date(Date.UTC(view.year, view.month, 0)).toISOString().slice(0, 10);
  const firstDayOfNextMonth = new Date(Date.UTC(view.year, view.month + 1, 1)).toISOString().slice(0, 10);
  const canGoPrev = min === undefined || lastDayOfPrevMonth >= min;
  const canGoNext = max === undefined || firstDayOfNextMonth <= max;

  const navButtonClasses =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-paper disabled:cursor-not-allowed disabled:text-muted/30 disabled:hover:bg-transparent';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        onClick={() => (isOpen ? close() : open())}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md border bg-surface px-3.5 text-left text-base font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-200 ${
          invalid
            ? 'border-danger bg-danger/[0.03] focus:ring-2 focus:ring-danger/20 aria-expanded:ring-2 aria-expanded:ring-danger/20'
            : 'border-line hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/25 aria-expanded:border-gold aria-expanded:ring-2 aria-expanded:ring-gold/25'
        }`}
      >
        <span className={value ? 'text-ink' : 'text-muted/70'}>{value ? formatDate(value) : placeholder}</span>
        <svg className="h-5 w-5 shrink-0 text-gold-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      </button>

      {/* Invisible input: carries the value in form submits and shows the browser's "required" message */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        suppressHydrationWarning
        name={name}
        required={required}
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      {isOpen &&
        createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Choose a date"
          style={popoverStyle}
          className="animate-modal-in z-[70] rounded-md border border-line bg-surface p-3 text-ink shadow-xl shadow-ink/15 normal-case tracking-normal"
        >
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} disabled={!canGoPrev} aria-label="Previous month" className={navButtonClasses}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
            </button>
            <p aria-live="polite" className="font-display text-lg font-semibold">
              {monthTitle}
            </p>
            <button type="button" onClick={() => shiftMonth(1)} disabled={!canGoNext} aria-label="Next month" className={navButtonClasses}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-xs font-bold uppercase text-muted" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1.5">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5" onKeyDown={handleGridKeyDown}>
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const iso = toIso(view.year, view.month, day);
              const disabled = isDisabled(iso);
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  data-iso={iso}
                  disabled={disabled}
                  tabIndex={iso === focusedIso ? 0 : -1}
                  aria-pressed={selected}
                  aria-current={iso === today ? 'date' : undefined}
                  aria-label={new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  onClick={() => {
                    onChange(iso);
                    close();
                  }}
                  className={`aspect-square cursor-pointer rounded-md text-sm tabular-nums transition-colors duration-150 ${
                    selected
                      ? 'bg-navy font-bold text-white'
                      : disabled
                        ? 'cursor-not-allowed text-muted/35'
                        : 'text-ink hover:bg-gold-soft'
                  } ${iso === today && !selected ? 'ring-1 ring-inset ring-gold' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
