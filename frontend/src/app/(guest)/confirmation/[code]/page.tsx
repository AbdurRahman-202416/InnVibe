import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/guest/Icon';
import { getBookingByCode, getRooms } from '@/lib/api';
import { describePayment, formatCurrency, formatDate, nightsBetween } from '@/lib/format';

export const dynamic = 'force-dynamic';


/** Confirmation page: looked up by the booking code in the URL (/confirmation/IV-7K2M9Q). */
export default async function ConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let booking;
  try {
    booking = await getBookingByCode(code);
  } catch {
    notFound();
  }

  // The room type and photo come from the catalogue; fall back gracefully if that call fails.
  const room = await getRooms()
    .then((rooms) => rooms.find((item) => item.roomNumber === booking.roomNumber))
    .catch(() => undefined);

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const firstName = booking.guestName.split(' ')[0];
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col items-center text-center">
        <span className={`flex h-14 w-14 items-center justify-center text-white rounded-md ${isCancelled ? 'bg-danger' : 'bg-success'}`}>
          <Icon path={isCancelled ? 'M6 6l12 12M18 6L6 18' : 'M5 13l4 4L19 7'} className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {isCancelled ? 'This booking was cancelled.' : <>You&apos;re booked, {firstName}.</>}
        </h1>
        <p className="mt-2 max-w-md text-base text-muted">
          {isCancelled
            ? `It was cancelled${booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt.slice(0, 10))}` : ''}. The room has been released. If you paid online, please contact our front desk about your refund.`
            : 'Keep this code. It is how you find your booking.'}
        </p>
        <p className={`mt-5 border px-6 py-3 text-3xl font-bold tabular-nums tracking-widest rounded-md ${isCancelled ? 'border-line bg-paper text-muted line-through' : 'border-gold bg-gold-soft text-gold-ink'}`}>
          {booking.code}
        </p>
      </div>

      <article className="mt-10 overflow-hidden border border-line bg-surface rounded-lg">
        {room && (
          <div className="relative aspect-[16/7]">
            <Image src={room.image} alt={`${room.type} room`} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        )}
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 p-6 text-sm sm:grid-cols-2 sm:p-8">
          <div>
            <dt className="text-muted">Room</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">
              {room ? `${room.type} · ` : ''}Room {booking.roomNumber}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Guests</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">{booking.guests}</dd>
          </div>
          <div>
            <dt className="text-muted">Check-in</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">{formatDate(booking.checkIn)}</dd>
          </div>
          <div>
            <dt className="text-muted">Check-out</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">{formatDate(booking.checkOut)}</dd>
          </div>
          <div>
            <dt className="text-muted">Guest</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">{booking.guestName}</dd>
          </div>
          <div>
            <dt className="text-muted">Payment</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">
              {describePayment(booking)}
            </dd>
            {booking.paymentReference && <dd className="text-xs text-muted">Ref {booking.paymentReference}</dd>}
          </div>
          {booking.specialRequests && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Special requests</dt>
              <dd className="mt-0.5 text-base text-ink">{booking.specialRequests}</dd>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-5 sm:col-span-2">
            <div className="flex justify-between text-muted">
              <dt>
                {formatCurrency(booking.subtotal / nights)} × {nights} night{nights > 1 ? 's' : ''}
              </dt>
              <dd>{formatCurrency(booking.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Service charge (10%)</dt>
              <dd>{formatCurrency(booking.serviceCharge)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>VAT (15%)</dt>
              <dd>{formatCurrency(booking.vat)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
              <dt className="text-base font-semibold text-ink">Total</dt>
              <dd className="font-display text-3xl font-semibold text-ink">{formatCurrency(booking.totalAmount)}</dd>
            </div>
          </div>
        </dl>
      </article>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center bg-navy px-5 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover rounded-md"
        >
          Back to home
        </Link>
        <Link
          href="/manage"
          className="inline-flex min-h-11 items-center justify-center border border-line px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold rounded-md"
        >
          Find another booking
        </Link>
        <Link
          href="/rooms"
          className="inline-flex min-h-11 items-center justify-center border border-line px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold rounded-md"
        >
          Book another stay
        </Link>
        <Link
          href={`/feedback?code=${booking.code}`}
          className="inline-flex min-h-11 items-center justify-center border border-line px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold rounded-md"
        >
          Share feedback
        </Link>
      </div>
    </div>
  );
}
