'use client';

import PaymentLogo from '@/components/guest/PaymentLogos';
import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { createBooking } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { PaymentInput, PaymentMethod } from '@/lib/types';
import Icon from './Icon';

interface CheckoutFormProps {
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  /** Total in taka, calculated by the server (shown on the pay button). */
  total: number;
}

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'card', label: 'Card', hint: 'Debit / credit card' },
  { value: 'bkash', label: 'bKash', hint: 'Mobile wallet' },
  { value: 'nagad', label: 'Nagad', hint: 'Mobile wallet' },
];

/** Steps listed in the "processing" popup. They advance on a timer, purely for feedback. */
const PROGRESS_STEPS = ['Connecting securely', 'Verifying your payment', 'Confirming your room'];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** "4242424242424242" -> "4242 4242 4242 4242" while typing. */
const formatCardNumber = (value: string) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

/** "1230" -> "12/30" while typing. */
const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

type FieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'cardholder'
  | 'cardNumber'
  | 'expiry'
  | 'cvc'
  | 'walletNumber'
  | 'walletPin'
  | 'agreed';

const MOBILE_NUMBER = /^01[3-9]\d{8}$/; // Bangladeshi mobile: 01 + operator digit + 8 digits

/**
 * Guest details + payment (card, bKash or Nagad). One POST /bookings call does everything:
 * the server checks availability again, takes the payment, calculates the price,
 * stores the booking and returns a confirmation code. We never store card numbers or wallet PINs.
 *
 * Validation: the form uses noValidate (no browser pop-ups). Every rule lives in `validate()`, which runs on each
 * render. A message is only SHOWN once the field was left (blur) or the user pressed Pay, so people are not
 * scolded while they are still typing their first character.
 */
export default function CheckoutForm({ roomNumber, checkIn, checkOut, guests, total }: CheckoutFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [walletPin, setWalletPin] = useState('');

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [progressStep, setProgressStep] = useState<number | null>(null); // null = popup closed
  const [errorMessage, setErrorMessage] = useState('');

  const walletLabel = method === 'bkash' ? 'bKash' : 'Nagad';

  /** All rules in one place. Returns a message for every invalid field, nothing for valid ones. */
  function validate(): Partial<Record<FieldKey, string>> {
    const errors: Partial<Record<FieldKey, string>> = {};

    if (guestName.trim().length < 2) errors.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guestEmail.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!MOBILE_NUMBER.test(guestPhone)) {
      errors.phone = 'Enter a valid mobile number.';
    }

    if (method === 'card') {
      if (cardholder.trim().length < 2) errors.cardholder = 'Enter the name on your card.';
      if (cardNumber.replace(/\D/g, '').length !== 16) errors.cardNumber = 'Card number must be 16 digits.';
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) errors.expiry = 'Use MM/YY.';
      if (!/^\d{3,4}$/.test(cvc)) errors.cvc = 'Enter a valid CVC.';
    } else {
      if (!MOBILE_NUMBER.test(walletNumber)) errors.walletNumber = `Enter a valid number.`;
      if (!/^\d{5}$/.test(walletPin)) errors.walletPin = `${walletLabel} PIN must be 5 digits.`;
    }

    if (!agreed) errors.agreed = 'Please accept the terms.';
    return errors;
  }

  const errors = validate();
  /** The message to display for a field (only after the user has left it or tried to submit). */
  const shown = (key: FieldKey) => (touched[key] || submitted ? errors[key] : undefined);

  /** Props every input shares: id, accessibility attributes, "touched" on blur, and the red/normal styling. */
  function field(key: FieldKey, extraClasses = '') {
    const hasError = Boolean(shown(key));
    return {
      id: `checkout-${key}`,
      'aria-invalid': hasError || undefined,
      'aria-describedby': hasError ? `checkout-${key}-error` : undefined,
      onBlur: () => setTouched((current) => ({ ...current, [key]: true })),
      className: `min-h-11 w-full border bg-surface px-3.5 text-base font-normal text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 rounded-md ${
        hasError
          ? 'border-danger bg-danger/[0.03] focus:border-danger focus:ring-2 focus:ring-danger/20'
          : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
      } ${extraClasses}`,
    };
  }

  /** Red message with an icon, shown under a field. Renders nothing when the field is fine. */
  function fieldError(name: FieldKey) {
    const message = shown(name);
    if (!message) return null;
    return (
      <p id={`checkout-${name}-error`} className="animate-modal-in flex items-start gap-1.5 text-sm text-danger">
        <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </p>
    );
  }

  const labelClasses = 'text-sm font-semibold text-ink';
  /** Phone-style prefix box: turns red together with its input. */
  const prefixClasses = (key: FieldKey) =>
    `flex min-h-11 items-center border border-r-0 bg-paper px-3.5 text-base text-muted rounded-l-md ${
      shown(key) ? 'border-danger' : 'border-line'
    }`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSubmitted(true);

    // Stop here when something is invalid, and put the cursor on the first problem.
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        firstInvalid?.focus({ preventScroll: true });
      });
      return;
    }

    const payment: PaymentInput =
      method === 'card'
        ? { method, cardholder: cardholder.trim(), cardNumber, expiry, cvc }
        : { method, mobileNumber: walletNumber, pin: walletPin };

    // Open the progress popup, and keep it up for at least ~2.4 s so each step is readable.
    setProgressStep(0);
    const timers = [setTimeout(() => setProgressStep(1), 800), setTimeout(() => setProgressStep(2), 1600)];

    try {
      const [booking] = await Promise.all([
        createBooking({
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone,
          specialRequests,
          guests,
          roomNumber,
          checkIn,
          checkOut,
          payment,
        }),
        wait(2400),
      ]);
      router.push(`/confirmation/${booking.code}`); // popup stays open until the next page appears
    } catch (error) {
      timers.forEach(clearTimeout);
      setProgressStep(null);
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  const invalidCount = Object.keys(errors).length;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
        {/* 1. Guest details */}
        <fieldset className="flex flex-col gap-5">
          <legend className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center bg-navy font-sans text-sm text-white rounded-md">1</span>
            Your details
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-name" className={labelClasses}>Full name</label>
              <input
                {...field('name')}
                autoComplete="name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Enter your full name"
              />
              {fieldError('name')}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-email" className={labelClasses}>Email</label>
              <input
                {...field('email')}
                type="email"
                autoComplete="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                placeholder="name@example.com"
              />
              {fieldError('email')}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="checkout-phone" className={labelClasses}>Mobile number</label>
              <div className="flex">
                <span className={prefixClasses('phone')}>+880</span>
                <input
                  {...field('phone', 'rounded-l-none tabular-nums')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              {fieldError('phone')}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="checkout-requests" className={labelClasses}>
                Special requests <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="checkout-requests"
                rows={3}
                maxLength={500}
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value)}
                placeholder="Late check-in, extra pillows, quiet room…"
                className="min-h-11 w-full border border-line bg-surface px-3.5 py-2.5 text-base font-normal text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/25 rounded-md"
              />
            </div>
          </div>
        </fieldset>

        {/* 2. Payment */}
        <fieldset className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <legend className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
              <span className="flex h-7 w-7 items-center justify-center bg-navy font-sans text-sm text-white rounded-md">2</span>
              Payment
            </legend>
          </div>

          {/* Payment method choice: three big radio buttons */}
          <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-3">
            {METHODS.map((option) => {
              const isSelected = method === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setMethod(option.value)}
                  className={`flex min-h-16 cursor-pointer flex-col items-center justify-center border px-2 py-2 transition-colors duration-200 ${
                    isSelected ? 'border-navy bg-paper ring-1 ring-navy' : 'border-line bg-surface hover:border-gold'
                  } rounded-md`}
                >
                  <span className="flex h-8 items-center">
                    <PaymentLogo method={option.value} />
                  </span>
                  <span className="sr-only">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </button>
              );
            })}
          </div>

          {method === 'card' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-cardholder" className={labelClasses}>Name on card</label>
                <input
                  {...field('cardholder')}
                  autoComplete="cc-name"
                  value={cardholder}
                  onChange={(event) => setCardholder(event.target.value)}
                />
                {fieldError('cardholder')}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-cardNumber" className={labelClasses}>Card number</label>
                <input
                  {...field('cardNumber', 'tabular-nums')}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  placeholder="1234 5678 9012 3456"
                />
                {fieldError('cardNumber')}
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="checkout-expiry" className={labelClasses}>Expiry (MM/YY)</label>
                  <input
                    {...field('expiry', 'tabular-nums')}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    placeholder="MM/YY"
                  />
                  {fieldError('expiry')}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="checkout-cvc" className={labelClasses}>CVC</label>
                  <input
                    {...field('cvc', 'tabular-nums')}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                  />
                  {fieldError('cvc')}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-walletNumber" className={labelClasses}>{walletLabel} account number</label>
                <div className="flex">
                  <span className={prefixClasses('walletNumber')}>+880</span>
                  <input
                    {...field('walletNumber', 'rounded-l-none tabular-nums')}
                    inputMode="numeric"
                    autoComplete="off"
                    value={walletNumber}
                    onChange={(event) => setWalletNumber(event.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                {fieldError('walletNumber')}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-walletPin" className={labelClasses}>PIN</label>
                <input
                  {...field('walletPin', 'tabular-nums')}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={walletPin}
                  onChange={(event) => setWalletPin(event.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="5 digits"
                />
                {fieldError('walletPin')}
              </div>
            </>
          )}

          <p className="flex items-center gap-2 text-xs text-muted">
            <Icon path="M12 11c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2zM8 11V8a4 4 0 118 0v3M6 11h12v9H6z" className="h-4 w-4" />
            Your payment details are never stored on our servers.
          </p>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-agreed" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
            <input
              id="checkout-agreed"
              type="checkbox"
              checked={agreed}
              aria-invalid={shown('agreed') ? true : undefined}
              aria-describedby={shown('agreed') ? 'checkout-agreed-error' : undefined}
              onChange={(event) => setAgreed(event.target.checked)}
              onBlur={() => setTouched((current) => ({ ...current, agreed: true }))}
              className={`mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#14284b] ${
                shown('agreed') ? 'outline outline-2 outline-offset-2 outline-danger' : ''
              }`}
            />
            I agree to the hotel&apos;s booking terms and cancellation policy.
          </label>
          {fieldError('agreed')}
        </div>

        {submitted && invalidCount > 0 && (
          <p role="alert" className="animate-modal-in flex items-center gap-2 border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger rounded-md">
            <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="h-5 w-5 shrink-0" />
            Please fix the {invalidCount} highlighted field{invalidCount > 1 ? 's' : ''} to continue.
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
            <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={progressStep !== null}
          className="min-h-12 cursor-pointer bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
        >
          Pay {formatCurrency(total)} and confirm
        </button>
      </form>

      {/* Progress popup: cannot be dismissed while the payment is running */}
      {progressStep !== null && (
        <Modal title="Processing your booking">
          <div role="status" aria-live="polite">
            <ol className="flex flex-col gap-4">
              {PROGRESS_STEPS.map((label, index) => {
                const isDone = index < progressStep;
                const isActive = index === progressStep;
                return (
                  <li key={label} className={`flex items-center gap-3 text-base ${isDone || isActive ? 'text-ink' : 'text-muted/60'}`}>
                    {isDone ? (
                      <span className="flex h-6 w-6 items-center justify-center bg-success text-white rounded-md">
                        <Icon path="M5 13l4 4L19 7" className="h-4 w-4" />
                      </span>
                    ) : isActive ? (
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-gold" aria-hidden="true" />
                    ) : (
                      <span className="h-6 w-6 border border-line rounded-md" aria-hidden="true" />
                    )}
                    {label}
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-sm text-muted">Please do not close or refresh this page.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
