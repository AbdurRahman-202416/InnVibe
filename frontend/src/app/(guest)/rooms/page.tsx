import Link from 'next/link';
import RoomTypeCard from '@/components/guest/RoomTypeCard';
import SearchForm from '@/components/guest/SearchForm';
import StateMessage from '@/components/StateMessage';
import { getAvailability, getQuote } from '@/lib/api';
import { addDays, formatDate, isIsoDate, nightsBetween, todayIso } from '@/lib/format';
import type { Room } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_ORDER: Room['type'][] = ['Single', 'Double', 'Deluxe', 'Suite'];

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Search results (server component). The search lives in the URL:
 *   /rooms?checkIn=2026-11-10&checkOut=2026-11-13&guests=2
 * We sanitise the params, ask the API which rooms are free for that stay,
 * then show ONE card per room type (with how many are left), like most hotel sites.
 */
export default async function RoomsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = todayIso();

  // Fall back to sensible defaults when a param is missing or invalid.
  const rawIn = Array.isArray(params.checkIn) ? params.checkIn[0] : params.checkIn;
  const rawOut = Array.isArray(params.checkOut) ? params.checkOut[0] : params.checkOut;
  const rawGuests = Number(Array.isArray(params.guests) ? params.guests[0] : params.guests);

  const checkIn = isIsoDate(rawIn) && rawIn >= today ? rawIn : addDays(today, 1);
  const checkOut = isIsoDate(rawOut) && rawOut > checkIn ? rawOut : addDays(checkIn, 2);
  const guests = Number.isInteger(rawGuests) && rawGuests >= 1 && rawGuests <= 4 ? rawGuests : 2;
  const nights = nightsBetween(checkIn, checkOut);

  let rooms;
  try {
    rooms = await getAvailability(checkIn, checkOut);
  } catch {
    rooms = null;
  }

  // Build one entry per room type that can host this many guests.
  const types = rooms
    ? TYPE_ORDER.map((type) => {
        const ofType = rooms.filter((room) => room.type === type && room.capacity >= guests);
        if (ofType.length === 0) return null;
        const free = ofType.filter((room) => room.isAvailable).sort((a, b) => a.pricePerNight - b.pricePerNight);
        return { type, sample: ofType[0], free };
      }).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  // Ask the API for the all-in price (rate + service charge + VAT) of the cheapest free room per type.
  const quotes = await Promise.all(
    types.map((item) => (item.free[0] ? getQuote(item.free[0].roomNumber, checkIn, checkOut).catch(() => null) : null)),
  );

  const totalFree = types.reduce((sum, item) => sum + item.free.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Rooms &amp; suites
      </h1>
      <p className="mt-2 text-base text-muted">
        {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {guests} guest
        {guests > 1 ? 's' : ''}
      </p>

      <div className="mt-8">
        {/* key forces the form to reset its internal state when the URL search changes */}
        <SearchForm
          key={`${checkIn}-${checkOut}-${guests}`}
          defaultCheckIn={checkIn}
          defaultCheckOut={checkOut}
          defaultGuests={guests}
          minDate={today}
        />
      </div>

      <section className="mt-10 flex flex-col gap-6" aria-live="polite">
        {rooms === null && (
          <StateMessage kind="error" message="Could not load rooms. Make sure the NestJS backend is running on port 4000." />
        )}

        {rooms && totalFree === 0 && (
          <div className="border border-gold/40 bg-gold-soft p-5 text-sm text-gold-ink rounded-md">
            No rooms are free for those dates. Try shifting your stay by a day or two.
          </div>
        )}

        {types.map(({ type, sample, free }, index) => {
          const cheapest = free[0];
          const quote = quotes[index];
          return (
            <RoomTypeCard
              key={type}
              priority={index === 0}
              type={type}
              image={sample.image}
              description={sample.description}
              amenities={sample.amenities}
              capacity={Math.max(...rooms!.filter((room) => room.type === type).map((room) => room.capacity))}
              pricePerNight={cheapest?.pricePerNight}
              totalPrice={quote?.totalAmount}
              roomsLeft={free.length}
              nights={nights}
              detailsHref={`/rooms/${(cheapest ?? sample).roomNumber}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`}
              reserveHref={
                cheapest
                  ? `/book?${new URLSearchParams({
                      room: cheapest.roomNumber,
                      checkIn,
                      checkOut,
                      guests: String(guests),
                    }).toString()}`
                  : undefined
              }
            />
          );
        })}

        {rooms && types.length === 0 && (
          <p className="border border-line bg-surface p-6 text-center text-sm text-muted rounded-lg">
            None of our rooms sleep {guests} guests.{' '}
            <Link href="/rooms" className="font-semibold text-gold-ink underline underline-offset-4">
              Reset search
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
