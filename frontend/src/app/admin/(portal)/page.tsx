import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StateMessage from '@/components/StateMessage';
import { getAvailability } from '@/lib/api';
import { getStaffBookings } from '@/lib/staff-server';
import { formatCurrency, formatDate } from '@/lib/format';
import type { RoomAvailability } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROOM_TYPES: RoomAvailability['type'][] = ['Single', 'Double', 'Deluxe', 'Suite'];

export default async function DashboardPage() {
  let rooms, bookings;

  try {
    let allBookings;
    [rooms, allBookings] = await Promise.all([getAvailability(), getStaffBookings()]);
    bookings = allBookings.filter((booking) => booking.status !== 'cancelled'); // cancelled bookings are not revenue or occupancy
  } catch {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Overview of your hotel" />
        <StateMessage
          kind="error"
          message="Could not reach the API. Make sure the NestJS backend is running on port 4000."
        />
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // A booking is "active" until its check-out date has passed.
  const activeBookingsCount = bookings.filter((booking) => booking.checkOut >= today).length;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
  const availableRoomsCount = rooms.filter((room) => room.isAvailable).length;
  const occupiedRoomsCount = rooms.length - availableRoomsCount;
  const occupancyPercent = rooms.length ? Math.round((occupiedRoomsCount / rooms.length) * 100) : 0;

  // Occupancy per room type, e.g. { type: 'Suite', occupied: 0, total: 2 }.
  const occupancyByType = ROOM_TYPES.map((type) => {
    const roomsOfType = rooms.filter((room) => room.type === type);
    return {
      type,
      total: roomsOfType.length,
      occupied: roomsOfType.filter((room) => !room.isAvailable).length,
    };
  }).filter((row) => row.total > 0);

  // Newest bookings last in the API array, so reverse a copy to show the latest first.
  const recentBookings = [...bookings].reverse().slice(0, 4);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A quick look at how your hotel is doing today." />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Rooms"
          value={rooms.length}
          hint={`${availableRoomsCount} free tonight`}
          iconPath="M3 20V8a2 2 0 012-2h14a2 2 0 012 2v12M3 14h18M7 10h4"
        />
        <StatCard
          label="Active Bookings"
          value={activeBookingsCount}
          hint={`${bookings.length} bookings in total`}
          iconPath="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          hint="From all recorded bookings"
          iconPath="M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2m0-10c1.2 0 2.3.4 3 1"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent bookings */}
        <div className="border border-line bg-surface lg:col-span-2 rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-xl font-semibold">Recent bookings</h2>
            <Link
              href="/admin/bookings"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {recentBookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-4 px-6 py-4 max-sm:px-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{booking.guestName}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Room {booking.roomNumber} · {formatDate(booking.checkIn)} →{' '}
                    {formatDate(booking.checkOut)}
                  </p>
                </div>
                <p className="shrink-0 font-display text-lg font-semibold">
                  {formatCurrency(booking.totalAmount)}
                </p>
              </li>
            ))}
            {recentBookings.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-muted">No bookings yet.</li>
            )}
          </ul>
        </div>

        {/* Occupancy */}
        <div className="border border-line bg-surface p-6 rounded-lg">
          <h2 className="font-display text-xl font-semibold">Occupancy</h2>
          <p className="mt-4 font-display text-5xl font-semibold leading-none">{occupancyPercent}%</p>
          <p className="mt-2 text-sm text-muted">
            {occupiedRoomsCount} of {rooms.length} rooms occupied
          </p>

          <ul className="mt-6 flex flex-col gap-4">
            {occupancyByType.map((row) => (
              <li key={row.type}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{row.type}</span>
                  <span className="text-muted">
                    {row.occupied}/{row.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 bg-line">
                  <div
                    className="h-full bg-gold"
                    style={{ width: `${(row.occupied / row.total) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
