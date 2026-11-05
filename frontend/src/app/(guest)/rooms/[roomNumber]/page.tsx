import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/guest/Icon';
import RoomDatePanel from '@/components/guest/RoomDatePanel';
import StateMessage from '@/components/StateMessage';
import { getAvailability, getQuote } from '@/lib/api';
import { addDays, formatCurrency, formatDate, isIsoDate, nightsBetween, todayIso } from '@/lib/format';
import type { Pricing, RoomAvailability } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ roomNumber: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { roomNumber } = await params;
  return { title: `Room ${roomNumber} | InnVibe` };
}

/** The same query string the search uses, so dates and guests carry over between pages. */
const stayQuery = (checkIn: string, checkOut: string, guests: number) =>
  new URLSearchParams({ checkIn, checkOut, guests: String(guests) }).toString();

export default async function RoomDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { roomNumber } = await params;
  const query = await searchParams;
  const today = todayIso();

  // Same defaults and sanitising as the search results page.
  const rawIn = first(query.checkIn);
  const rawOut = first(query.checkOut);
  const rawGuests = Number(first(query.guests));
  const checkIn = isIsoDate(rawIn) && rawIn >= today ? rawIn : addDays(today, 1);
  const checkOut = isIsoDate(rawOut) && rawOut > checkIn ? rawOut : addDays(checkIn, 2);
  const nights = nightsBetween(checkIn, checkOut);

  let rooms: RoomAvailability[];
  try {
    rooms = await getAvailability(checkIn, checkOut);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <StateMessage kind="error" message="Could not reach the API. Make sure the NestJS backend is running on port 4000." />
      </div>
    );
  }

  const room = rooms.find((item) => item.roomNumber === roomNumber);
  if (!room) notFound();

  const guests = Number.isInteger(rawGuests) && rawGuests >= 1 ? Math.min(rawGuests, room.capacity) : Math.min(2, room.capacity);
  const fitsGuests = !Number.isInteger(rawGuests) || rawGuests <= room.capacity;

  // Price for this room and stay, from the API (rate + service charge + VAT).
  let pricing: Pricing | null = null;
  if (room.isAvailable) {
    pricing = await getQuote(room.roomNumber, checkIn, checkOut).catch(() => null);
  }

  // Up to three other room types as suggestions, free ones first.
  const others = (['Single', 'Double', 'Deluxe', 'Suite'] as const)
    .filter((type) => type !== room.type)
    .map((type) => {
      const ofType = rooms.filter((item) => item.type === type);
      return ofType.find((item) => item.isAvailable) ?? ofType[0];
    })
    .filter((item): item is RoomAvailability => Boolean(item))
    .slice(0, 3);

  const stay = stayQuery(checkIn, checkOut, guests);
  const facts = [
    { label: 'Sleeps', value: `Up to ${room.capacity}`, path: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8z' },
    { label: 'Size', value: `${room.size} m²`, path: 'M4 4h16v16H4zM4 9h5M9 4v5' },
    { label: 'Bed', value: room.bed, path: 'M3 20V8a2 2 0 012-2h14a2 2 0 012 2v12M3 14h18M7 10h4' },
    { label: 'View', value: room.view, path: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={`/rooms?${stay}`} className="underline-offset-4 hover:text-ink hover:underline">
          Rooms &amp; suites
        </Link>
        <span aria-hidden="true" className="mx-2">›</span>
        <span className="text-ink">{room.type} · Room {room.roomNumber}</span>
      </nav>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">{room.type}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            Room {room.roomNumber}
          </h1>
        </div>
        <p className="text-base text-muted">
          From <span className="font-display text-2xl font-semibold text-ink">{formatCurrency(room.pricePerNight)}</span> / night
        </p>
      </div>

      {/* Gallery: main photo plus two more */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:grid-rows-2">
        {room.gallery.slice(0, 3).map((src, index) => (
          <div
            key={src}
            className={`relative overflow-hidden rounded-lg ${
              index === 0 ? 'aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[26rem]' : 'hidden aspect-[4/3] sm:block'
            }`}
          >
            <Image
              src={src}
              alt={index === 0 ? `${room.type} room ${room.roomNumber}` : `${room.type} room, more photos`}
              fill
              priority={index === 0}
              sizes={index === 0 ? '(min-width: 640px) 66vw, 100vw' : '33vw'}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr] lg:items-start">
        {/* Left: details */}
        <div className="order-2 lg:order-1">
          <h2 className="font-display text-2xl font-semibold text-ink">About this room</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">{room.description}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-line bg-surface p-4">
                <Icon path={fact.path} className="h-5 w-5 text-gold-ink" />
                <dt className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{fact.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-12 font-display text-2xl font-semibold text-ink">What is included</h2>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {room.amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2.5 border-t border-line pt-3 text-base text-ink">
                <Icon path="M5 13l4 4L19 7" className="h-5 w-5 shrink-0 text-gold-ink" />
                {amenity}
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-2xl font-semibold text-ink">Good to know</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line text-base">
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Check-in / check-out</dt>
              <dd className="text-right font-semibold text-ink">From 2:00 pm / until 12:00 noon</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Cancellation</dt>
              <dd className="text-right font-semibold text-ink">Free up to 24 hours before check-in</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Taxes and fees</dt>
              <dd className="text-right font-semibold text-ink">10% service charge + 15% VAT, shown in the total</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Payment</dt>
              <dd className="text-right font-semibold text-ink">Card, bKash or Nagad</dd>
            </div>
          </dl>
        </div>

        {/* Right: dates, availability and price for THIS room */}
        <aside className="order-1 rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24 lg:order-2">
          <h2 className="font-display text-2xl font-semibold text-ink">Check your dates</h2>
          <div className="mt-5">
            <RoomDatePanel
              key={`${checkIn}-${checkOut}-${guests}`}
              roomNumber={room.roomNumber}
              capacity={room.capacity}
              defaultCheckIn={checkIn}
              defaultCheckOut={checkOut}
              defaultGuests={guests}
              minDate={today}
            />
          </div>

          <div className="mt-6 border-t border-line pt-5" aria-live="polite">
            {!fitsGuests ? (
              <p className="rounded-md border border-gold/40 bg-gold-soft p-4 text-sm text-gold-ink">
                This room sleeps up to {room.capacity} guest{room.capacity > 1 ? 's' : ''}. We have shown it for {guests}.
              </p>
            ) : null}

            {pricing ? (
              <div className={fitsGuests ? '' : 'mt-4'}>
                <p className="flex items-center gap-2 text-sm font-semibold text-success">
                  <Icon path="M5 13l4 4L19 7" className="h-4 w-4" />
                  Available {formatDate(checkIn)} → {formatDate(checkOut)}
                </p>
                <dl className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between text-muted">
                    <dt>{formatCurrency(pricing.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}</dt>
                    <dd>{formatCurrency(pricing.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-muted">
                    <dt>Service charge (10%)</dt>
                    <dd>{formatCurrency(pricing.serviceCharge)}</dd>
                  </div>
                  <div className="flex justify-between text-muted">
                    <dt>VAT (15%)</dt>
                    <dd>{formatCurrency(pricing.vat)}</dd>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
                    <dt className="font-semibold text-ink">Total</dt>
                    <dd className="font-display text-3xl font-semibold text-ink">{formatCurrency(pricing.totalAmount)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/book?${new URLSearchParams({ room: room.roomNumber, checkIn, checkOut, guests: String(guests) })}`}
                  className="mt-5 flex min-h-12 items-center justify-center rounded-md bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover"
                >
                  Reserve this room
                </Link>
              </div>
            ) : (
              <div className={fitsGuests ? '' : 'mt-4'}>
                <p className="rounded-md border border-gold/40 bg-gold-soft p-4 text-sm leading-relaxed text-gold-ink">
                  Room {room.roomNumber} is not available for {formatDate(checkIn)} → {formatDate(checkOut)}.
                  Try other dates, or see what is free for this stay.
                </p>
                <Link
                  href={`/rooms?${stay}`}
                  className="mt-4 flex min-h-11 items-center justify-center rounded-md border border-line px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold"
                >
                  See available rooms
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Other room types */}
      {others.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Other rooms you may like</h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {others.map((other) => (
              <li key={other.roomNumber}>
                <Link
                  href={`/rooms/${other.roomNumber}?${stay}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-gold"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={other.image}
                      alt={`${other.type} room`}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${other.isAvailable ? '' : 'grayscale'}`}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-xl font-semibold text-ink">{other.type}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {other.isAvailable ? `From ${formatCurrency(other.pricePerNight)} / night` : 'Sold out for these dates'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
