import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import Icon from './Icon';

export interface RoomTypeCardProps {
  type: string;
  image: string;
  description: string;
  amenities: string[];
  capacity: number;
  /** Cheapest room of this type that is free for the stay (undefined = sold out). */
  pricePerNight?: number;
  /** Full price for the stay including service charge and VAT, from the API quote. */
  totalPrice?: number;
  roomsLeft: number;
  nights: number;
  /** Link target of the Reserve button (undefined when sold out). */
  reserveHref?: string;
  /** Link to the detail page of a room of this type. */
  detailsHref: string;
  /** Set on the first card of the page: it is the largest image above the fold. */
  priority?: boolean;
}

/** One room TYPE in the search results: photo, details and a Reserve button. */
export default function RoomTypeCard({
  type,
  image,
  description,
  amenities,
  capacity,
  pricePerNight,
  totalPrice,
  roomsLeft,
  nights,
  reserveHref,
  detailsHref,
  priority = false,
}: RoomTypeCardProps) {
  const soldOut = !reserveHref || pricePerNight === undefined || totalPrice === undefined;

  return (
    <article className="grid grid-cols-1 border border-line bg-surface md:grid-cols-[2fr_3fr] overflow-hidden rounded-lg">
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-72">
        <Image
          src={image}
          alt={`${type} room at InnVibe`}
          fill
          priority={priority}
          sizes="(min-width: 768px) 40vw, 100vw"
          className={`object-cover ${soldOut ? 'grayscale' : ''}`}
        />
      </div>

      <div className="flex flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-3xl font-semibold text-ink">
              <Link href={detailsHref} className="underline-offset-4 hover:underline">
                {type}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted">Sleeps up to {capacity}</p>
          </div>
          {!soldOut && (
            <p className="text-sm font-semibold text-success">
              {roomsLeft <= 2 ? `Only ${roomsLeft} left` : `${roomsLeft} available`}
            </p>
          )}
        </div>

        <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 pb-4 text-sm text-ink">
          {amenities.slice(0, 5).map((amenity) => (
            <li key={amenity} className="flex items-center gap-1.5">
              <Icon path="M5 13l4 4L19 7" className="h-4 w-4 text-gold-ink" />
              {amenity}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
          {soldOut ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-muted">Sold out for these dates. Try different dates.</p>
              <Link
                href={detailsHref}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold"
              >
                View details
              </Link>
            </div>
          ) : (
            <>
              <div>
                <p className="font-display text-3xl font-semibold text-ink">
                  {formatCurrency(pricePerNight)}
                  <span className="font-sans text-sm font-normal text-muted"> / night</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {formatCurrency(totalPrice)} total for {nights} night{nights > 1 ? 's' : ''}, incl. taxes &amp; fees
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={detailsHref}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold"
              >
                View details
              </Link>
              <Link
                href={reserveHref}
                className="inline-flex min-h-11 items-center justify-center bg-navy px-7 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover rounded-md"
              >
                Reserve
              </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
