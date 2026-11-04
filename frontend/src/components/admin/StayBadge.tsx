import { stayStatus, type StayStatus } from '@/lib/format';
import type { Booking } from '@/lib/types';

export type BookingStatus = StayStatus | 'cancelled';

const STYLES: Record<BookingStatus, { label: string; dot: string }> = {
  upcoming: { label: 'Upcoming', dot: 'bg-gold' },
  current: { label: 'In house', dot: 'bg-success' },
  past: { label: 'Completed', dot: 'bg-muted/50' },
  cancelled: { label: 'Cancelled', dot: 'bg-danger' },
};

/** What to show for a booking: "Cancelled" wins, otherwise where the stay is relative to today. */
export const bookingStatus = (booking: Booking): BookingStatus =>
  booking.status === 'cancelled' ? 'cancelled' : stayStatus(booking.checkIn, booking.checkOut);

/** Coloured dot + text (never colour alone). */
export default function StayBadge({ status }: { status: BookingStatus }) {
  const { label, dot } = STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
