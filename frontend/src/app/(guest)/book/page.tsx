import Link from 'next/link';
import BookingSummary from '@/components/guest/BookingSummary';
import CheckoutForm from '@/components/guest/CheckoutForm';
import StateMessage from '@/components/StateMessage';
import { getAvailability, getQuote } from '@/lib/api';
import { isIsoDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Three-step indicator: where the guest is in the booking journey. */
function Stepper() {
  const steps = ['Choose a room', 'Details & payment', 'Confirmation'];
  return (
    <ol className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label="Booking steps">
      {steps.map((label, index) => {
        const isCurrent = index === 1;
        const isDone = index === 0;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={isCurrent ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 items-center justify-center text-xs font-bold ${
                isCurrent ? 'bg-navy text-white' : isDone ? 'bg-gold text-white' : 'border border-line text-muted'
              } rounded-md`}
            >
              {isDone ? '✓' : index + 1}
            </span>
            <span className={isCurrent ? 'font-semibold text-ink' : 'text-muted'}>{label}</span>
            {index < steps.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Checkout page (server component for the data, client components for the form and popups).
 * URL: /book?room=201&checkIn=...&checkOut=...&guests=2
 * We re-check availability on the server so a stale link cannot book a taken room,
 * and every number on this page comes from the API's /bookings/quote.
 */
export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const roomNumber = first(params.room);
  const checkIn = first(params.checkIn);
  const checkOut = first(params.checkOut);
  const guests = Number(first(params.guests) ?? 1);

  const backToSearch = (
    <Link href="/rooms" className="font-semibold text-gold-ink underline underline-offset-4">
      Back to search
    </Link>
  );

  if (!roomNumber || !isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <p className="border border-line bg-surface p-6 text-sm text-muted rounded-lg">
          That booking link is incomplete. {backToSearch}
        </p>
      </div>
    );
  }

  let rooms;
  let pricing;
  try {
    rooms = await getAvailability(checkIn, checkOut);
    pricing = await getQuote(roomNumber, checkIn, checkOut);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <StateMessage kind="error" message="Could not reach the API. Make sure the NestJS backend is running on port 4000." />
      </div>
    );
  }

  const room = rooms.find((item) => item.roomNumber === roomNumber);
  if (!room || !room.isAvailable) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <p className="border border-gold/40 bg-gold-soft p-6 text-sm text-gold-ink rounded-md">
          Sorry, that room is no longer available for those dates. {backToSearch}
        </p>
      </div>
    );
  }

  const roomsLeft = rooms.filter((item) => item.type === room.type && item.isAvailable).length;
  const safeGuests = Number.isInteger(guests) && guests >= 1 && guests <= room.capacity ? guests : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Confirm your stay</h1>
      <Stepper />

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="order-2 border border-line bg-surface p-6 sm:p-8 lg:order-1 rounded-lg">
          <CheckoutForm
            roomNumber={room.roomNumber}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={safeGuests}
            total={pricing.totalAmount}
          />
        </div>

        <div className="order-1 lg:order-2">
          <BookingSummary
            type={room.type}
            roomNumber={room.roomNumber}
            image={room.image}
            amenities={room.amenities}
            guests={safeGuests}
            checkIn={checkIn}
            checkOut={checkOut}
            pricing={pricing}
            roomsLeft={roomsLeft}
          />
        </div>
      </div>
    </div>
  );
}
