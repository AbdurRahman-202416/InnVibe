'use client';

import { useId, useState } from 'react';
import DatePicker from '@/components/ui/DatePicker';
import Select from '@/components/ui/Select';
import { addDays } from '@/lib/format';

interface RoomDatePanelProps {
  roomNumber: string;
  capacity: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultGuests: number;
  /** Earliest selectable date (today), passed from the server to avoid hydration mismatches. */
  minDate: string;
}

export default function RoomDatePanel({
  roomNumber,
  capacity,
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests,
  minDate,
}: RoomDatePanelProps) {
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(String(Math.min(defaultGuests, capacity)));
  const ids = useId();

  const guestOptions = Array.from({ length: capacity }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} guest${index > 0 ? 's' : ''}`,
  }));
  const labelClasses = 'text-xs font-bold uppercase tracking-[0.12em] text-muted';

  return (
    <form action={`/rooms/${roomNumber}`} method="get" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span id={`${ids}-in`} className={labelClasses}>Check-in</span>
          <DatePicker
            name="checkIn"
            required
            value={checkIn}
            min={minDate}
            labelledBy={`${ids}-in`}
            onChange={(value) => {
              setCheckIn(value);
              if (checkOut <= value) setCheckOut(addDays(value, 1));
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span id={`${ids}-out`} className={labelClasses}>Check-out</span>
          <DatePicker
            name="checkOut"
            required
            value={checkOut}
            min={addDays(checkIn, 1)}
            onChange={setCheckOut}
            labelledBy={`${ids}-out`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={`${ids}-guests`} className={labelClasses}>Guests</span>
        <Select name="guests" value={guests} onChange={setGuests} options={guestOptions} labelledBy={`${ids}-guests`} />
      </div>
      <button
        type="submit"
        className="min-h-11 cursor-pointer rounded-md border border-navy px-6 text-sm font-semibold tracking-wide text-navy transition-colors duration-200 hover:bg-navy hover:text-white"
      >
        Check these dates
      </button>
    </form>
  );
}
