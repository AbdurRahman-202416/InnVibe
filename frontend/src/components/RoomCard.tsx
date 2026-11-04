import { formatCurrency } from '@/lib/format';
import type { RoomAvailability } from '@/lib/types';

interface RoomCardProps {
  room: RoomAvailability;
  onBookNow: (room: RoomAvailability) => void;
}

/** Flat card for one room: type, big serif number, status, price and a Book Now button. */
export default function RoomCard({ room, onBookNow }: RoomCardProps) {
  return (
    <article className="group flex flex-col border border-line bg-surface p-6 transition-colors duration-200 hover:border-gold rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">{room.type}</p>

        {/* status = coloured dot + text, so it never relies on colour alone */}
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${room.isAvailable ? 'bg-success' : 'bg-muted/50'}`}
          />
          {room.isAvailable ? 'Free tonight' : 'Occupied'}
        </p>
      </div>

      <p className="mt-6 font-display text-6xl font-semibold leading-none tracking-tight text-ink">
        {room.roomNumber}
      </p>

      <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
        <p className="text-sm text-muted">Per night</p>
        <p className="font-display text-2xl font-semibold text-ink">
          {formatCurrency(room.pricePerNight)}
        </p>
      </div>

      <button
        type="button"
        disabled={!room.isAvailable}
        onClick={() => onBookNow(room)}
        className="mt-5 min-h-11 w-full cursor-pointer bg-navy px-4 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-paper disabled:text-muted rounded-md"
      >
        {room.isAvailable ? 'Book now' : 'Occupied tonight'}
      </button>
    </article>
  );
}
