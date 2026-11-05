'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import BookingDetailsModal from '@/components/admin/BookingDetailsModal';
import FilterGroup from '@/components/admin/FilterGroup';
import SearchInput from '@/components/admin/SearchInput';
import StayBadge, { bookingStatus } from '@/components/admin/StayBadge';
import BookingModal from '@/components/BookingModal';
import PageHeader from '@/components/PageHeader';
import StateMessage from '@/components/StateMessage';
import { getAvailability } from '@/lib/api';
import { formatCurrency, formatDate, nightsBetween } from '@/lib/format';
import { getStaffBookingsClient, type BookingFilters } from '@/lib/staff-client';
import type { Booking, RoomAvailability } from '@/lib/types';

type Source = NonNullable<BookingFilters['source']>;
/** The "Stay" filter: where the stay is, or cancelled bookings. */
type View = NonNullable<BookingFilters['when']> | 'cancelled';

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'online', label: 'Website' },
  { value: 'front-desk', label: 'Front desk' },
];
const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'current', label: 'In house' },
  { value: 'past', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** "3 nights" / "1 night" label for a booking. */
const nightsLabel = (booking: Booking) => {
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  return `${nights} night${nights === 1 ? '' : 's'}`;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  // /admin/bookings?q=IV-XXXXXX opens the list already searched (used by the "View booking" link on the Feedback page).
  const initialQuery = useSearchParams().get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [source, setSource] = useState<Source>('');
  const [view, setView] = useState<View>('');
  const hasFilters = Boolean(debouncedQuery.trim() || source || view);
  // Busy from the first keystroke (waiting for the typing pause) until the answer arrives.
  const isBusy = isSearching || query !== debouncedQuery;

  // Wait until the user pauses typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Rooms are only needed for the "New booking" form and to show the room type in the details.
  useEffect(() => {
    getAvailability().then(setRooms).catch(() => undefined);
  }, []);

  // Every request gets a number. Only the newest one may update the screen, so a slow older answer
  // can never overwrite the result of what was typed last (and never switches the spinner off early).
  const latestRequest = useRef(0);

  const loadBookings = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsSearching(true);
    try {
      const rows = await getStaffBookingsClient({
        q: debouncedQuery.trim(),
        source,
        when: view === 'cancelled' ? '' : view,
        status: view === 'cancelled' ? 'cancelled' : '',
      });
      if (requestId !== latestRequest.current) return; // a newer search has started: drop this answer
      // The API is oldest-booked-first, so reverse it: the booking made last is on top.
      setBookings([...rows].reverse());
      setErrorMessage('');
    } catch {
      if (requestId !== latestRequest.current) return;
      setErrorMessage('Could not load bookings. Please check your connection and try again.');
    }
    setIsLoading(false);
    setIsSearching(false);
  }, [debouncedQuery, source, view]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSource('');
    setView('');
  };
  const roomFor = (booking: Booking) => rooms.find((room) => room.roomNumber === booking.roomNumber);

  return (
    // From the lg breakpoint the page fills the screen: header and search stay put and only the list scrolls
    // (100dvh minus the 3rem top and bottom padding of the portal layout). Below lg the whole page scrolls as usual.
    <div className="lg:flex lg:h-[calc(100dvh-6rem)] lg:flex-col">
      <PageHeader
        compact
        title="Bookings"
        subtitle="Every reservation, from the website and the front desk. Latest arrivals first."
        action={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-navy px-5 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover rounded-md"
          >
            <span aria-hidden="true" className="text-lg leading-none text-gold">+</span>
            New booking
          </button>
        }
      />

      {/* Search + filters */}
      <div className="mb-4 flex shrink-0 flex-col gap-3 xl:flex-row xl:items-center">
        <div className="xl:max-w-md xl:flex-1">
          <SearchInput value={query} onChange={setQuery} isLoading={isBusy} placeholder="Search code, name or phone" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap">
          <FilterGroup label="Booked via" options={SOURCE_OPTIONS} value={source} onChange={setSource} />
          <FilterGroup label="Stay" options={VIEW_OPTIONS} value={view} onChange={setView} />
        </div>
      </div>

      {isLoading && <StateMessage kind="loading" message="Loading bookings…" />}
      {errorMessage && <StateMessage kind="error" message={errorMessage} />}

      {!isLoading && !errorMessage && (
        <div
          aria-busy={isBusy}
          className={`lg:flex lg:min-h-0 lg:flex-1 lg:flex-col transition-opacity duration-200 ${isBusy ? 'opacity-60' : ''}`}
        >
          <p className="mb-3 shrink-0 text-sm text-muted" aria-live="polite">
            {isBusy
              ? 'Searching…'
              : hasFilters
              ? `${bookings.length} ${bookings.length === 1 ? 'booking matches' : 'bookings match'} your search`
              : `${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}`}
          </p>

          {/* Table for md and up. overflow-x-auto keeps it scrollable on narrow tablets. */}
          <div className="hidden overflow-x-auto border border-line bg-surface [contain:paint] md:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto rounded-lg">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface text-xs uppercase tracking-[0.12em] text-muted shadow-[0_1px_0_var(--color-line)]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Guest</th>
                  <th scope="col" className="px-6 py-4 font-bold">Room</th>
                  <th scope="col" className="px-6 py-4 font-bold">Stay</th>
                  <th scope="col" className="px-6 py-4 font-bold">Source</th>
                  <th scope="col" className="px-6 py-4 text-right font-bold">Total</th>
                  <th scope="col" className="px-4 py-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="transition-colors duration-150 hover:bg-paper">
                    <td className="px-6 py-4">
                      <p className={`text-base font-semibold ${booking.status === 'cancelled' ? 'text-muted' : 'text-ink'}`}>{booking.guestName}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted">
                        {booking.code}
                        {booking.guestEmail ? ` · ${booking.guestEmail}` : ''}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="border border-line px-2.5 py-1 font-semibold tabular-nums text-navy rounded-md">
                        {booking.roomNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <p>
                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                        <span className="ml-2 text-xs">({nightsLabel(booking)})</span>
                      </p>
                      <div className="mt-1"><StayBadge status={bookingStatus(booking)} /></div>
                    </td>
                    <td className="px-6 py-4 text-muted">{booking.source === 'online' ? 'Website' : 'Front desk'}</td>
                    <td className={`px-6 py-4 text-right font-display text-lg font-semibold tabular-nums ${booking.status === 'cancelled' ? 'text-muted line-through' : 'text-ink'}`}>
                      {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(booking)}
                        aria-label={`View details for booking ${booking.code}, ${booking.guestName}`}
                        className="min-h-11 cursor-pointer border border-line px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold hover:bg-gold-soft rounded-md"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list for mobile. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {bookings.map((booking) => (
              <li key={booking.id} className="border border-line bg-surface p-5 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-ink">{booking.guestName}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted">{booking.code}</p>
                  </div>
                  <span className="shrink-0 border border-line px-2.5 py-1 text-sm font-semibold tabular-nums text-navy rounded-md">
                    Room {booking.roomNumber}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StayBadge status={bookingStatus(booking)} />
                  <span className="text-sm text-muted">{booking.source === 'online' ? 'Website' : 'Front desk'}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className={`font-display text-xl font-semibold tabular-nums ${booking.status === 'cancelled' ? 'text-muted line-through' : 'text-ink'}`}>
                    {formatCurrency(booking.totalAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(booking)}
                    aria-label={`View details for booking ${booking.code}, ${booking.guestName}`}
                    className="min-h-11 cursor-pointer border border-line px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold hover:bg-gold-soft rounded-md"
                  >
                    View details
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {bookings.length === 0 && (
            <div className="border border-line bg-surface p-8 text-center rounded-lg">
              <p className="text-sm text-muted">{hasFilters ? 'No bookings match your search.' : 'No bookings yet. Create the first one!'}</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 min-h-11 cursor-pointer text-sm font-semibold text-gold-ink underline underline-offset-4 hover:text-ink"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <BookingModal rooms={rooms} onClose={() => setIsModalOpen(false)} onBooked={loadBookings} />
      )}
      {selected && (
        <BookingDetailsModal
          booking={selected}
          room={roomFor(selected)}
          onClose={() => setSelected(null)}
          onCancelled={() => {
            loadBookings();
            getAvailability().then(setRooms).catch(() => undefined); // the room is free again
          }}
        />
      )}
    </div>
  );
}
