'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useId, useState } from 'react';
import DatePicker from '@/components/ui/DatePicker';
import Select from '@/components/ui/Select';
import { getQuote } from '@/lib/api';
import { addDays, formatCurrency, MOBILE_NUMBER, nightsBetween, todayIso } from '@/lib/format';
import FieldError from '@/components/ui/FieldError';
import { createStaffBooking } from '@/lib/staff-client';
import type { FrontDeskPaymentMethod, Pricing, Room } from '@/lib/types';

interface BookingModalProps {
  /** Every room; the server checks the dates and rejects overlaps. */
  rooms: Room[];
  /** Room preselected when the user clicked "Book now" on a card. */
  initialRoomNumber?: string;
  onClose: () => void;
  /** Called after the API confirmed the booking so the parent can refresh its data. */
  onBooked: () => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** How the guest pays at the desk. "pay-later" records that nothing was collected yet. */
const PAYMENT_OPTIONS: { value: FrontDeskPaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Cash', hint: 'paid at the desk' },
  { value: 'pos', label: 'Card (POS)', hint: 'paid by card machine' },
  { value: 'bkash', label: 'bKash', hint: 'mobile wallet' },
  { value: 'nagad', label: 'Nagad', hint: 'mobile wallet' },
  { value: 'bank', label: 'Bank transfer', hint: 'received in the account' },
  { value: 'pay-later', label: 'Pay at check-in', hint: 'not paid yet' },
];
/** Methods where staff can note a receipt or transaction number. */
const NEEDS_REFERENCE: FrontDeskPaymentMethod[] = ['pos', 'bkash', 'nagad', 'bank'];

/** Small section title used to group the form. */
function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">{children}</h3>;
}

export default function BookingModal({ rooms, initialRoomNumber, onClose, onBooked }: BookingModalProps) {
  const ids = useId();
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requests, setRequests] = useState('');
  const [payMethod, setPayMethod] = useState<FrontDeskPaymentMethod>('cash');
  const [payReference, setPayReference] = useState('');
  const [roomNumber, setRoomNumber] = useState(initialRoomNumber ?? rooms[0]?.roomNumber ?? '');
  const [checkIn, setCheckIn] = useState(todayIso());
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [attempted, setAttempted] = useState(false); // true after the first "Confirm" click: errors become visible
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [quote, setQuote] = useState<Pricing | null>(null);

  const room = rooms.find((item) => item.roomNumber === roomNumber);
  const capacity = room?.capacity ?? 1;
  const safeGuests = Math.min(guests, capacity); // a room with fewer beds lowers the guest count automatically
  const nights = checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const nameError = attempted && !guestName.trim() ? 'Enter the guest name.' : '';
  const phoneError = attempted && !MOBILE_NUMBER.test(phone) ? 'Enter a valid mobile number.' : '';
  const emailError = attempted && email.trim() && !EMAIL.test(email.trim()) ? 'Enter a valid e-mail address.' : '';
  const checkOutError = attempted && !checkOut ? 'Select a check-out date.' : '';

  // Escape closes the dialog (an open calendar/dropdown handles Escape first), the page behind stops
  // scrolling, and focus goes back to the button that opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  // Live price. The numbers come from the server (rate + service charge + VAT),
  // so what staff see here is exactly what will be saved.
  useEffect(() => {
    let isCurrent = true; // ignore answers that arrive after the inputs changed again
    if (!roomNumber || !checkIn || !checkOut || nightsBetween(checkIn, checkOut) < 1) {
      setQuote(null);
      return;
    }
    getQuote(roomNumber, checkIn, checkOut)
      .then((result) => isCurrent && setQuote(result))
      .catch(() => isCurrent && setQuote(null));
    return () => {
      isCurrent = false;
    };
  }, [roomNumber, checkIn, checkOut]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setAttempted(true);

    // Put the cursor on the first problem, in the order the fields appear.
    const firstProblem = !guestName.trim()
      ? `${ids}-name`
      : !MOBILE_NUMBER.test(phone)
        ? `${ids}-phone`
        : email.trim() && !EMAIL.test(email.trim())
          ? `${ids}-email`
          : !checkOut
            ? `${ids}-out-trigger`
            : '';
    if (firstProblem) {
      document.getElementById(firstProblem)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await createStaffBooking({
        guestName: guestName.trim(),
        guestPhone: phone,
        guestEmail: email.trim() || undefined,
        specialRequests: requests.trim() || undefined,
        guests: safeGuests,
        roomNumber,
        checkIn,
        checkOut,
        paymentMethod: payMethod,
        paymentReference: NEEDS_REFERENCE.includes(payMethod) ? payReference.trim() || undefined : undefined,
      });
      onBooked();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelClasses = 'text-sm font-semibold text-ink';
  const inputClasses = (invalid: boolean) =>
    `min-h-11 w-full border bg-surface px-3.5 text-base font-normal text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 rounded-md ${
      invalid
        ? 'border-danger bg-danger/[0.03] focus:ring-2 focus:ring-danger/20'
        : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
    }`;

  return (
    // Backdrop: clicking outside the card closes the dialog.
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-in flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg border border-line bg-surface shadow-2xl sm:max-h-[min(46rem,calc(100dvh-3rem))] sm:max-w-4xl sm:rounded-lg"
      >
        {/* Header: always visible */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Front desk</p>
            <h2 id={`${ids}-title`} className="font-display text-2xl font-semibold text-ink">
              New booking
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-paper hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {rooms.length === 0 ? (
          <p className="m-6 border border-gold/40 bg-gold-soft p-4 text-sm text-gold-ink rounded-md">No rooms to show.</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            {/* Body: the only part that scrolls */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
                {/* Left: the form */}
                <div className="flex flex-col gap-7 px-5 py-6 sm:px-8">
                  <section className="flex flex-col gap-4">
                    <SectionTitle>Guest</SectionTitle>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr]">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${ids}-name`} className={labelClasses}>Guest name</label>
                        <input
                          id={`${ids}-name`}
                          autoFocus
                          autoComplete="off"
                          value={guestName}
                          onChange={(event) => setGuestName(event.target.value)}
                          placeholder="Guest full name"
                          aria-invalid={nameError ? true : undefined}
                          aria-describedby={nameError ? `${ids}-name-error` : undefined}
                          className={inputClasses(Boolean(nameError))}
                        />
                        {nameError && <FieldError id={`${ids}-name-error`} message={nameError} />}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span id={`${ids}-guests`} className={labelClasses}>Guests</span>
                        <Select
                          value={String(safeGuests)}
                          onChange={(value) => setGuests(Number(value))}
                          labelledBy={`${ids}-guests`}
                          options={Array.from({ length: capacity }, (_, index) => ({
                            value: String(index + 1),
                            label: `${index + 1} guest${index > 0 ? 's' : ''}`,
                          }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${ids}-phone`} className={labelClasses}>Mobile number</label>
                        <div className="flex">
                          <span
                            className={`flex min-h-11 items-center rounded-l-md border border-r-0 bg-paper px-3.5 text-base text-muted ${
                              phoneError ? 'border-danger' : 'border-line'
                            }`}
                          >
                            +880
                          </span>
                          <input
                            id={`${ids}-phone`}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="off"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="01XXXXXXXXX"
                            aria-invalid={phoneError ? true : undefined}
                            aria-describedby={phoneError ? `${ids}-phone-error` : undefined}
                            className={`${inputClasses(Boolean(phoneError))} rounded-l-none tabular-nums`}
                          />
                        </div>
                        {phoneError && <FieldError id={`${ids}-phone-error`} message={phoneError} />}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${ids}-email`} className={labelClasses}>
                          E-mail <span className="font-normal text-muted">(optional)</span>
                        </label>
                        <input
                          id={`${ids}-email`}
                          type="email"
                          autoComplete="off"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="name@example.com"
                          aria-invalid={emailError ? true : undefined}
                          aria-describedby={emailError ? `${ids}-email-error` : undefined}
                          className={inputClasses(Boolean(emailError))}
                        />
                        {emailError && <FieldError id={`${ids}-email-error`} message={emailError} />}
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <SectionTitle>Room</SectionTitle>
                    <div className="flex flex-col gap-1.5">
                      <span id={`${ids}-room`} className={labelClasses}>Choose a room</span>
                      <Select
                        value={roomNumber}
                        onChange={setRoomNumber}
                        labelledBy={`${ids}-room`}
                        options={rooms.map((item) => ({
                          value: item.roomNumber,
                          label: `${item.roomNumber} · ${item.type}`,
                          hint: `up to ${item.capacity} · ${formatCurrency(item.pricePerNight)}/night`,
                        }))}
                      />
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <SectionTitle>Stay</SectionTitle>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <span id={`${ids}-in`} className={labelClasses}>Check-in</span>
                        <DatePicker
                          value={checkIn}
                          min={todayIso()}
                          labelledBy={`${ids}-in`}
                          onChange={(value) => {
                            setCheckIn(value);
                            // Keep check-out after check-in; with no check-out yet, suggest one night.
                            if (!checkOut || checkOut <= value) setCheckOut(addDays(value, 1));
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span id={`${ids}-out`} className={labelClasses}>Check-out</span>
                        <DatePicker
                          triggerId={`${ids}-out-trigger`}
                          value={checkOut}
                          min={checkIn ? addDays(checkIn, 1) : todayIso()}
                          onChange={setCheckOut}
                          labelledBy={`${ids}-out`}
                          invalid={Boolean(checkOutError)}
                          describedBy={`${ids}-out-error`}
                        />
                        {checkOutError && <FieldError id={`${ids}-out-error`} message={checkOutError} />}
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <SectionTitle>Payment</SectionTitle>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <span id={`${ids}-pay`} className={labelClasses}>Payment method</span>
                        <Select
                          value={payMethod}
                          onChange={(value) => setPayMethod(value as FrontDeskPaymentMethod)}
                          labelledBy={`${ids}-pay`}
                          options={PAYMENT_OPTIONS}
                        />
                      </div>
                      {NEEDS_REFERENCE.includes(payMethod) && (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`${ids}-ref`} className={labelClasses}>
                            Receipt no. <span className="font-normal text-muted">(optional)</span>
                          </label>
                          <input
                            id={`${ids}-ref`}
                            autoComplete="off"
                            maxLength={40}
                            value={payReference}
                            onChange={(event) => setPayReference(event.target.value)}
                            placeholder="e.g. 8N7A5K2P"
                            className={inputClasses(false)}
                          />
                        </div>
                      )}
                    </div>
                    {payMethod === 'pay-later' && (
                      <p className="text-sm text-muted">Nothing is collected now. The booking will show as pay at check-in.</p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${ids}-requests`} className={labelClasses}>
                        Special requests <span className="font-normal text-muted">(optional)</span>
                      </label>
                      <textarea
                        id={`${ids}-requests`}
                        rows={2}
                        maxLength={500}
                        value={requests}
                        onChange={(event) => setRequests(event.target.value)}
                        placeholder="Late check-in, extra pillows, quiet room…"
                        className={`${inputClasses(false)} py-2.5`}
                      />
                    </div>
                  </section>
                </div>

                {/* Right: live summary */}
                <aside
                  aria-label="Booking summary"
                  className="border-t border-line bg-paper px-5 py-6 sm:px-8 lg:border-l lg:border-t-0"
                >
                  <SectionTitle>Summary</SectionTitle>
                  {room && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
                      <div className="relative aspect-[16/9]">
                        <Image
                          src={room.image}
                          alt={`${room.type} room ${room.roomNumber}`}
                          fill
                          sizes="(min-width: 1024px) 340px, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-display text-xl font-semibold text-ink">
                          {room.type} · Room {room.roomNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Up to {room.capacity} guest{room.capacity > 1 ? 's' : ''} · {room.size} m² · {room.bed}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5" aria-live="polite">
                    {quote ? (
                      <dl className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between text-muted">
                          <dt>
                            {formatCurrency(quote.pricePerNight)} × {quote.nights} night{quote.nights > 1 ? 's' : ''}
                          </dt>
                          <dd>{formatCurrency(quote.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between text-muted">
                          <dt>Service charge (10%)</dt>
                          <dd>{formatCurrency(quote.serviceCharge)}</dd>
                        </div>
                        <div className="flex justify-between text-muted">
                          <dt>VAT (15%)</dt>
                          <dd>{formatCurrency(quote.vat)}</dd>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
                          <dt className="font-semibold text-ink">Total</dt>
                          <dd className="font-display text-2xl font-semibold text-ink">{formatCurrency(quote.totalAmount)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
                        Choose a check-out date to see the price.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </div>

            {/* Footer: always visible */}
            <footer className="shrink-0 border-t border-line bg-surface px-5 py-4 sm:px-8">
              {errorMessage && (
                <p role="alert" className="mb-3 flex items-start gap-2 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errorMessage}
                </p>
              )}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {quote ? (
                    <>
                      <p className="text-xs text-muted">
                        Total · {nights} night{nights > 1 ? 's' : ''}
                      </p>
                      <p className="font-display text-2xl font-semibold leading-tight text-ink">{formatCurrency(quote.totalAmount)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Select dates to see the total</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="hidden min-h-11 cursor-pointer rounded-md px-5 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-paper hover:text-ink sm:inline-flex sm:items-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-11 cursor-pointer bg-navy px-6 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
                  >
                    {isSubmitting ? 'Booking…' : 'Confirm booking'}
                  </button>
                </div>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
