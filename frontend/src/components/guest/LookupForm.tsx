'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { lookupBookings } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Booking } from '@/lib/types';

/** Checks the single search box. Returns a short message, or '' when the text looks like a code, e-mail or mobile number. */
function validate(text: string): string {
  const value = text.trim();
  if (!value) return 'Enter your confirmation code, e-mail or mobile number.';
  if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : 'Enter a valid e-mail address.';
  if (/^[+\d][\d\s-]*$/.test(value)) return /^\+?\d[\d\s-]{9,15}$/.test(value) ? '' : 'Enter a valid mobile number.';
  return /^(IV-)?[A-Za-z0-9]{6}$/.test(value.replace(/\s/g, '')) ? '' : 'Enter a valid confirmation code.';
}

/**
 * "My booking": one box for a confirmation code, an e-mail address or a mobile number.
 * One match opens the confirmation page; several (same e-mail or number) are listed to pick from.
 */
export default function LookupForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [results, setResults] = useState<Booking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldError = validate(query) || (notFound ? '' : serverError);
  const showError = submitted && !!fieldError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    setNotFound(false);
    setResults([]);
    if (validate(query)) return;

    setIsSubmitting(true);
    try {
      const bookings = await lookupBookings(query.trim());
      if (bookings.length === 1) {
        router.push(`/confirmation/${bookings[0].code}`);
        return; // keep the button disabled while the next page loads
      }
      setResults(bookings);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      // "Not found" is not a typing mistake, so it gets its own friendly box instead of a red field error.
      if (message.startsWith('We could not find')) setNotFound(true);
      else setServerError(message);
    }
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lookup-query" className="text-sm font-semibold text-ink">
            Confirmation code, e-mail or mobile number
          </label>
          <input
            id="lookup-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setServerError('');
              setNotFound(false);
            }}
            placeholder="IV-XXXXXX, name@example.com or 01XXXXXXXXX"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={showError}
            aria-describedby={showError ? 'lookup-error' : undefined}
            className={`min-h-11 w-full border bg-surface px-3.5 text-base text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:ring-2 rounded-md ${
              showError ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-line focus:border-gold focus:ring-gold/25'
            }`}
          />
          {showError && (
            <p id="lookup-error" role="alert" className="text-sm text-danger">
              {fieldError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 cursor-pointer bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
        >
          {isSubmitting ? 'Searching…' : 'Find my booking'}
        </button>
      </form>

      {notFound && (
        <div role="status" className="rounded-md border border-line bg-paper px-5 py-4 text-center">
          <p className="text-sm font-semibold text-ink">We couldn&apos;t find a booking with those details.</p>
          <p className="mt-1 text-sm text-muted">Check the spelling and try again, or reserve a room with us.</p>
          <Link
            href="/rooms"
            className="mt-3 inline-flex min-h-11 items-center rounded-md border border-navy px-5 text-sm font-semibold text-navy transition-colors duration-200 hover:bg-navy hover:text-white"
          >
            Browse rooms
          </Link>
        </div>
      )}

      {results.length > 1 && (
        <div>
          <p className="text-sm font-semibold text-ink">{results.length} bookings found</p>
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/confirmation/${booking.code}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-line bg-paper px-4 py-2.5 transition-colors duration-200 hover:border-gold"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold tracking-widest text-ink">{booking.code}</span>
                    <span className="block text-sm text-muted">
                      Room {booking.roomNumber} · {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${booking.status === 'cancelled' ? 'text-danger' : 'text-gold-ink'}`}>
                    {booking.status === 'cancelled' ? 'Cancelled' : 'View'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
