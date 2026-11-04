'use client';

import { useId, useState } from 'react';
import DatePicker from '@/components/ui/DatePicker';
import Select from '@/components/ui/Select';
import { addDays } from '@/lib/format';

interface SearchFormProps {
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultGuests: number;
  /** Earliest selectable date (today). Passed from the server to avoid hydration mismatches. */
  minDate: string;
}

const GUEST_OPTIONS = [1, 2, 3, 4].map((count) => ({
  value: String(count),
  label: `${count} guest${count > 1 ? 's' : ''}`,
}));

/**
 * Availability search. It is a plain HTML GET form that goes to /rooms?checkIn=..&checkOut=..&guests=..
 * so the search lives in the URL (shareable, back-button friendly, works without extra state libraries).
 * The custom DatePicker and Select each render a hidden input, so the normal form submit still carries the values.
 * The only extra logic: keep check-out after check-in.
 */
export default function SearchForm({ defaultCheckIn, defaultCheckOut, defaultGuests, minDate }: SearchFormProps) {
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(String(defaultGuests));
  const ids = useId();

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    // If the stay would end before (or on) arrival, push check-out to the next day.
    if (value && checkOut <= value) setCheckOut(addDays(value, 1));
  }

  const labelClasses = 'text-xs font-bold uppercase tracking-[0.12em] text-muted';

  return (
    <form
      action="/rooms"
      method="get"
      className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-5 shadow-xl shadow-ink/10 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1fr_1fr_0.7fr_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <span id={`${ids}-in`} className={labelClasses}>Check-in</span>
        <DatePicker name="checkIn" required value={checkIn} onChange={handleCheckInChange} min={minDate} labelledBy={`${ids}-in`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={`${ids}-out`} className={labelClasses}>Check-out</span>
        <DatePicker
          name="checkOut"
          required
          value={checkOut}
          onChange={setCheckOut}
          min={checkIn ? addDays(checkIn, 1) : minDate}
          labelledBy={`${ids}-out`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={`${ids}-guests`} className={labelClasses}>Guests</span>
        <Select name="guests" value={guests} onChange={setGuests} options={GUEST_OPTIONS} labelledBy={`${ids}-guests`} />
      </div>
      <button
        type="submit"
        className="min-h-11 cursor-pointer rounded-md bg-navy px-7 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover sm:col-span-2 lg:col-span-1"
      >
        Check availability
      </button>
    </form>
  );
}
