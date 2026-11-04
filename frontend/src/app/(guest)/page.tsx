import Image from 'next/image';
import Link from 'next/link';
import Faq from '@/components/guest/Faq';
import HeroSlider from '@/components/guest/HeroSlider';
import Icon from '@/components/guest/Icon';
import NewsletterForm from '@/components/guest/NewsletterForm';
import SearchForm from '@/components/guest/SearchForm';
import StateMessage from '@/components/StateMessage';
import { getRooms } from '@/lib/api';
import { addDays, formatCurrency, todayIso } from '@/lib/format';
import type { Room } from '@/lib/types';

/** Server component, always fresh (prices come from the API). */
export const dynamic = 'force-dynamic';

/** "Why book direct": real features of this demo, not made-up discounts. */
const BENEFITS = [
  {
    title: 'All-in prices',
    text: 'The total you see includes the 10% service charge and 15% VAT. No surprises at checkout.',
    path: 'M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01',
  },
  {
    title: 'Pay your way',
    text: 'Card, bKash or Nagad. Choose what is easiest for you.',
    path: 'M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h2',
  },
  {
    title: 'Free cancellation',
    text: 'Change of plans? Cancel up to 24 hours before check-in at no cost.',
    path: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 16l2 2 4-4',
  },
  {
    title: 'Breakfast in every Suite',
    text: 'Start the day with a full breakfast, included when you book a Suite.',
    path: 'M4 9h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V9zM17 10h1.500a2.500 2.500 0 010 5H17M8 3v3M12 3v3',
  },
];

const FACILITIES = [
  { label: 'Outdoor pool', path: 'M3 17c2 0 2-1.5 4.5-1.5S10 17 12 17s2.5-1.5 4.5-1.5S19 17 21 17M3 21c2 0 2-1.5 4.5-1.5S10 21 12 21s2.5-1.5 4.5-1.5S19 21 21 21M8 13V6a2 2 0 014 0M14 13V6a2 2 0 014 0' },
  { label: 'Restaurant & bar', path: 'M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9' },
  { label: 'Spa & wellness', path: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z' },
  { label: 'Fitness room', path: 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12' },
  { label: 'Free Wi-Fi', path: 'M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01' },
  { label: 'Airport pickup', path: 'M5 17h14M5 17a2 2 0 01-2-2v-3l2-5h14l2 5v3a2 2 0 01-2 2M5 17v2M19 17v2M3 12h18' },
  { label: 'Meeting rooms', path: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8' },
  { label: '24-hour front desk', path: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

/** One card per room type, using the cheapest room's price as the "from" price. */
function groupByType(rooms: Room[]) {
  const types: Room['type'][] = ['Single', 'Double', 'Deluxe', 'Suite'];
  return types
    .map((type) => {
      const ofType = rooms.filter((room) => room.type === type);
      if (ofType.length === 0) return null;
      const cheapest = ofType.reduce((a, b) => (a.pricePerNight <= b.pricePerNight ? a : b));
      return { ...cheapest, fromPrice: cheapest.pricePerNight, maxCapacity: Math.max(...ofType.map((room) => room.capacity)) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/** Guest landing page: hero + availability search, room types, highlights. */
export default async function LandingPage() {
  const today = todayIso();
  const checkIn = addDays(today, 1);
  const checkOut = addDays(today, 3);

  let roomTypes: ReturnType<typeof groupByType> = [];
  let hasError = false;
  try {
    roomTypes = groupByType(await getRooms());
  } catch {
    hasError = true;
  }

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <HeroSlider />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/90 via-navy/60 to-navy/45" />

        <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-8 sm:pb-40 sm:pt-32">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">Boutique hotel</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Stay somewhere worth coming back to.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
            Quiet rooms, warm light and a pool at sunset. Pick your dates and book in a minute.
          </p>
        </div>
      </section>

      {/* Search card overlaps the bottom of the hero */}
      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 sm:-mt-24 sm:px-8">
        <SearchForm defaultCheckIn={checkIn} defaultCheckOut={checkOut} defaultGuests={2} minDate={today} />
      </div>

      {/* Room types */}
      <section id="rooms" className="mx-auto mt-24 max-w-6xl px-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Rooms &amp; suites</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          A room for every kind of trip
        </h2>

        {hasError ? (
          <div className="mt-8">
            <StateMessage kind="error" message="Rooms could not be loaded. Make sure the NestJS backend is running on port 4000." />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {roomTypes.map((room) => (
              <Link
                key={room.type}
                href={`/rooms/${room.roomNumber}`}
                className="group flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-200 hover:border-gold rounded-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={room.image}
                    alt={`${room.type} room`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-2xl font-semibold text-ink">{room.type}</h3>
                  <p className="mt-1 text-sm text-muted">Up to {room.maxCapacity} guest{room.maxCapacity > 1 ? 's' : ''}</p>
                  <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
                    From{' '}
                    <span className="font-display text-xl font-semibold text-ink">
                      {formatCurrency(room.fromPrice)}
                    </span>{' '}
                    / night
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-muted">Rates are per night. A 10% service charge and 15% VAT are added at checkout.</p>
      </section>

      {/* Why book direct */}
      <section id="why-direct" className="mt-24 scroll-mt-24 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Why book direct</p>
          <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The best way to book is with us
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((item) => (
              <li key={item.title}>
                <span className="flex h-12 w-12 items-center justify-center border border-line bg-paper text-gold-ink rounded-md">
                  <Icon path={item.path} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Gallery + facilities */}
      <section id="facilities" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Facilities</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Everything you need, nothing you do not
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-96">
            <Image src="/images/gallery-pool.jpg" alt="Tropical pool surrounded by palms and timber pavilions" fill sizes="(min-width: 640px) 66vw, 100vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image src="/images/gallery-dusk.jpg" alt="Whitewashed hotel at dusk reflected in the pool" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image src="/images/gallery-lounge.jpg" alt="Classic lounge corner of a guest room" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
          </div>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {FACILITIES.map((item) => (
            <li key={item.label} className="flex items-center gap-3 border-t border-line pt-4">
              <Icon path={item.path} className="h-6 w-6 shrink-0 text-gold-ink" />
              <span className="text-sm font-semibold text-ink sm:text-base">{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="mt-24 scroll-mt-24 bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white">Offers and news, in your inbox</h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              A short note when we have something worth sharing. No spam, and you can leave any time.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto mt-24 max-w-3xl scroll-mt-24 px-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Good to know</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-8">
          <Faq />
        </div>
      </section>
    </>
  );
}
