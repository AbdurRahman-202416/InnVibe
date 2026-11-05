'use client';

import { useCallback, useEffect, useState } from 'react';
import BookingModal from '@/components/BookingModal';
import PageHeader from '@/components/PageHeader';
import RoomCard from '@/components/RoomCard';
import StateMessage from '@/components/StateMessage';
import { getAvailability } from '@/lib/api';
import type { RoomAvailability } from '@/lib/types';

type AvailabilityFilter = 'all' | 'available' | 'booked';

const FILTERS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Free tonight' },
  { value: 'booked', label: 'Occupied' },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('all');
  const [roomToBook, setRoomToBook] = useState<RoomAvailability | null>(null);

  // useCallback gives us a stable function we can reuse after a booking is made.
  const loadRooms = useCallback(async () => {
    try {
      setRooms(await getAvailability());
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not load rooms. Make sure the NestJS backend is running on port 4000.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const visibleRooms = rooms.filter((room) => {
    if (filter === 'available') return room.isAvailable;
    if (filter === 'booked') return !room.isAvailable;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Rooms"
        subtitle="Every room and whether it is free tonight. Book at the front desk."
        action={
          <div role="group" aria-label="Filter rooms" className="inline-flex overflow-hidden border border-line bg-surface rounded-md">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`min-h-11 cursor-pointer px-4 text-sm font-semibold transition-colors duration-200 ${
                  filter === option.value ? 'bg-navy text-white' : 'text-muted hover:bg-paper hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading && <StateMessage kind="loading" message="Loading rooms…" />}
      {errorMessage && <StateMessage kind="error" message={errorMessage} />}

      {!isLoading && !errorMessage && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleRooms.map((room) => (
            <RoomCard key={room.id} room={room} onBookNow={setRoomToBook} />
          ))}
          {visibleRooms.length === 0 && (
            <p className="col-span-full border border-line bg-surface p-6 text-center text-sm text-muted rounded-lg">
              No rooms match this filter.
            </p>
          )}
        </section>
      )}

      {roomToBook && (
        <BookingModal
          rooms={rooms}
          initialRoomNumber={roomToBook.roomNumber}
          onClose={() => setRoomToBook(null)}
          onBooked={loadRooms}
        />
      )}
    </>
  );
}
