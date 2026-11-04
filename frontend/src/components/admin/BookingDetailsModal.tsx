'use client';

import { FormEvent, useState } from 'react';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, formatDateTime, nightsBetween, todayIso } from '@/lib/format';
import { cancelStaffBooking } from '@/lib/staff-client';
import type { Booking, Room } from '@/lib/types';
import StayBadge, { bookingStatus } from './StayBadge';

const PAYMENT_LABELS = { card: 'Card', bkash: 'bKash', nagad: 'Nagad' } as const;
const QUICK_REASONS = ['Guest requested', 'No-show', 'Payment problem', 'Room unavailable', 'Duplicate booking'];
const MAX_REASON = 300;

/** One label + value row of the details list. Renders nothing when there is no value. */
function Row({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="flex justify-between gap-6 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

interface BookingDetailsModalProps {
  booking: Booking;
  room?: Room;
  onClose: () => void;
  /** Called after the booking was cancelled, so the list behind the dialog can refresh. */
  onCancelled: () => void;
}

/**
 * Everything the staff may need about one booking (contact, stay, payment, requests, price breakdown),
 * plus a second step to cancel it: the staff must give a reason, the booking is kept (marked cancelled)
 * and its room becomes available again.
 */
export default function BookingDetailsModal({ booking, room, onClose, onCancelled }: BookingDetailsModalProps) {
  const [step, setStep] = useState<'details' | 'cancel'>('details');
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const isCancelled = booking.status === 'cancelled';
  const canCancel = !isCancelled && booking.checkOut > todayIso(); // a finished stay cannot be cancelled
  const paid = booking.paymentLast4
    ? `${PAYMENT_LABELS[booking.paymentMethod ?? 'card']} ending ${booking.paymentLast4}`
    : 'Not paid online (front desk)';
  const reasonError = attempted && reason.trim().length < 3 ? 'Please give a reason (at least 3 characters).' : '';

  async function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setErrorMessage('');
    if (reason.trim().length < 3) return;

    setIsSubmitting(true);
    try {
      await cancelStaffBooking(booking.code, reason.trim());
      onCancelled();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  }

  // ---- Step 2: cancel with a reason ----
  if (step === 'cancel') {
    return (
      <Modal title="Cancel this booking?" size="lg" onClose={isSubmitting ? undefined : onClose}>
        <form onSubmit={handleCancel} noValidate>
          <div className="border border-line bg-paper p-4 text-sm rounded-md">
            <p className="font-semibold text-ink">
              {booking.guestName} · <span className="tabular-nums">{booking.code}</span>
            </p>
            <p className="mt-1 text-muted">
              {room ? `${room.type} · ` : ''}Room {booking.roomNumber} · {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{' '}
              {formatCurrency(booking.totalAmount)}
            </p>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            The booking is kept in the list as <strong className="text-ink">Cancelled</strong>, and room {booking.roomNumber} becomes
            available for these dates straight away.
            {booking.source === 'online' && ' This guest paid online. Refund them separately: this system does not move money.'}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <label htmlFor="cancel-reason" className="text-sm font-semibold text-ink">
              Reason for cancelling
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Quick reasons">
              {QUICK_REASONS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setReason(quick)}
                  className={`min-h-9 cursor-pointer border px-3 text-sm transition-colors duration-200 rounded-md ${
                    reason === quick ? 'border-navy bg-paper font-semibold text-ink' : 'border-line text-muted hover:border-gold hover:text-ink'
                  }`}
                >
                  {quick}
                </button>
              ))}
            </div>
            <textarea
              id="cancel-reason"
              autoFocus
              rows={3}
              maxLength={MAX_REASON}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this booking being cancelled?"
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? 'cancel-reason-error' : undefined}
              className={`min-h-11 w-full border bg-surface px-3.5 py-2.5 text-base text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 rounded-md ${
                reasonError
                  ? 'border-danger bg-danger/[0.03] focus:ring-2 focus:ring-danger/20'
                  : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
              }`}
            />
            <div className="flex items-start justify-between gap-3">
              {reasonError ? (
                <p id="cancel-reason-error" className="animate-modal-in flex items-start gap-1.5 text-sm text-danger">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {reasonError}
                </p>
              ) : (
                <span />
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted">{reason.length}/{MAX_REASON}</span>
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="mt-3 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep('details')}
              disabled={isSubmitting}
              className="min-h-11 cursor-pointer px-5 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-paper hover:text-ink disabled:opacity-60 rounded-md"
            >
              Keep booking
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 cursor-pointer bg-danger px-6 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-[#8f1b12] disabled:cursor-wait disabled:opacity-60 rounded-md"
            >
              {isSubmitting ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ---- Step 1: details ----
  return (
    <Modal title="Booking details" size="lg" onClose={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-gold/40 bg-gold-soft px-4 py-3 rounded-md">
        <p className="text-xl font-bold tabular-nums tracking-widest text-gold-ink">{booking.code}</p>
        <StayBadge status={bookingStatus(booking)} />
      </div>

      {isCancelled && (
        <div className="mt-4 border border-danger/30 bg-danger/5 p-4 text-sm rounded-md">
          <p className="font-semibold text-danger">Cancelled{booking.cancelledAt ? ` on ${formatDateTime(booking.cancelledAt)}` : ''}</p>
          {booking.cancelReason && <p className="mt-1 break-words text-ink">Reason: {booking.cancelReason}</p>}
          {booking.cancelledBy && <p className="mt-1 text-muted">By {booking.cancelledBy}</p>}
        </div>
      )}

      <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Guest</h3>
      <dl className="mt-1 divide-y divide-line">
        <Row label="Name">{booking.guestName}</Row>
        <Row label="E-mail">
          {booking.guestEmail ? (
            <a href={`mailto:${booking.guestEmail}`} className="text-gold-ink underline underline-offset-4 hover:text-ink">
              {booking.guestEmail}
            </a>
          ) : (
            <span className="font-normal text-muted">Not given</span>
          )}
        </Row>
        <Row label="Mobile">
          {booking.guestPhone ? (
            <a href={`tel:${booking.guestPhone}`} className="text-gold-ink underline underline-offset-4 hover:text-ink">
              {booking.guestPhone}
            </a>
          ) : (
            <span className="font-normal text-muted">Not given</span>
          )}
        </Row>
        <Row label="Guests">{booking.guests}</Row>
      </dl>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Stay</h3>
      <dl className="mt-1 divide-y divide-line">
        <Row label="Room">{room ? `${room.type} · Room ${booking.roomNumber}` : `Room ${booking.roomNumber}`}</Row>
        <Row label="Check-in">{formatDate(booking.checkIn)}</Row>
        <Row label="Check-out">{formatDate(booking.checkOut)}</Row>
        <Row label="Nights">{nights}</Row>
        <Row label="Booked via">{booking.source === 'online' ? 'Website' : 'Front desk'}</Row>
      </dl>

      {booking.specialRequests && (
        <>
          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Special requests</h3>
          <p className="mt-2 whitespace-pre-wrap break-words border border-line bg-paper p-3 text-sm text-ink rounded-md">
            {booking.specialRequests}
          </p>
        </>
      )}

      <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Payment</h3>
      <dl className="mt-1 divide-y divide-line">
        <Row label="Method">{paid}</Row>
        <Row label="Reference">{booking.paymentReference}</Row>
        <Row label={`${formatCurrency(booking.subtotal / nights)} × ${nights} night${nights > 1 ? 's' : ''}`}>
          {formatCurrency(booking.subtotal)}
        </Row>
        <Row label="Service charge (10%)">{formatCurrency(booking.serviceCharge)}</Row>
        <Row label="VAT (15%)">{formatCurrency(booking.vat)}</Row>
      </dl>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-semibold text-ink">Total</span>
        <span className={`font-display text-3xl font-semibold ${isCancelled ? 'text-muted line-through' : 'text-ink'}`}>
          {formatCurrency(booking.totalAmount)}
        </span>
      </div>

      {canCancel && (
        <div className="mt-6 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setStep('cancel')}
            className="min-h-11 cursor-pointer border border-danger/40 px-5 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger/5 rounded-md"
          >
            Cancel this booking…
          </button>
        </div>
      )}
    </Modal>
  );
}
