'use client';

import Link from 'next/link';
import { FormEvent, useState, type KeyboardEvent } from 'react';
import { submitReview } from '@/lib/api';
import Icon from './Icon';

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const CATEGORIES = [
  { value: 'praise', label: 'Praise', hint: 'Something we did well' },
  { value: 'suggestion', label: 'Suggestion', hint: 'An idea to improve' },
  { value: 'complaint', label: 'Complaint', hint: 'Something went wrong' },
] as const;
const MAX_MESSAGE = 1000;

type FieldKey = 'code' | 'email' | 'rating' | 'category' | 'message';

export default function FeedbackForm({ defaultCode = '' }: { defaultCode?: string }) {
  const [code, setCode] = useState(defaultCode.toUpperCase());
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value'] | ''>('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [thanksName, setThanksName] = useState<string | null>(null);

  const errors: Partial<Record<FieldKey, string>> = {};
  if (!/^IV-[A-Z0-9]{6}$/.test(code.trim())) errors.code = 'Enter a valid booking code.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (rating < 1) errors.rating = 'Choose a rating.';
  if (!category) errors.category = 'Pick one.';
  if (message.trim().length < 10) errors.message = 'Write at least 10 characters.';

  const shown = (key: FieldKey) => (touched[key] || submitted ? errors[key] : undefined);
  const touch = (key: FieldKey) => setTouched((current) => ({ ...current, [key]: true }));

  const inputClasses = (key: FieldKey, extra = '') =>
    `min-h-11 w-full border bg-surface px-3.5 text-base font-normal text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 rounded-md ${
      shown(key) ? 'border-danger bg-danger/[0.03] focus:ring-2 focus:ring-danger/20' : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
    } ${extra}`;
  const a11y = (key: FieldKey) => ({
    id: `feedback-${key}`,
    'aria-invalid': shown(key) ? (true as const) : undefined,
    'aria-describedby': shown(key) ? `feedback-${key}-error` : undefined,
    onBlur: () => touch(key),
  });
  const fieldError = (key: FieldKey) =>
    shown(key) ? (
      <p id={`feedback-${key}-error`} className="animate-modal-in flex items-start gap-1.5 text-sm text-danger">
        <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{shown(key)}</span>
      </p>
    ) : null;

  function handleStarKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setRating((value) => Math.min(5, value + 1));
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setRating((value) => Math.max(1, value - 1));
    else return;
    event.preventDefault();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage('');
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('form [aria-invalid="true"], form [role=radiogroup][aria-invalid="true"] button');
        first?.focus();
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await submitReview({ code: code.trim(), email: email.trim(), rating, category, message: message.trim() });
      setThanksName(result.guestName.split(' ')[0]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (thanksName !== null) {
    return (
      <div className="flex flex-col items-center py-6 text-center" role="status">
        <span className="flex h-14 w-14 items-center justify-center bg-success text-white rounded-md">
          <Icon path="M5 13l4 4L19 7" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 font-display text-3xl font-semibold text-ink">Thank you, {thanksName}.</h2>
        <p className="mt-2 max-w-sm text-base text-muted">Your feedback has reached our team. We read every message.</p>
        <Link href="/" className="mt-7 inline-flex min-h-11 items-center bg-navy px-7 text-sm font-semibold text-white transition-colors duration-200 hover:bg-navy-hover rounded-md">
          Back to home
        </Link>
      </div>
    );
  }

  const labelClasses = 'text-sm font-semibold text-ink';
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback-code" className={labelClasses}>Booking code</label>
          <input
            {...a11y('code')}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="IV-XXXXXX"
            autoComplete="off"
            className={inputClasses('code', 'tracking-widest tabular-nums')}
          />
          {fieldError('code')}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback-email" className={labelClasses}>Email used for the booking</label>
          <input
            {...a11y('email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className={inputClasses('email')}
          />
          {fieldError('email')}
        </div>
      </div>

      {/* Rating */}
      <div className="flex flex-col gap-2">
        <span id="feedback-rating-label" className={labelClasses}>How was your stay?</span>
        <div
          role="radiogroup"
          aria-labelledby="feedback-rating-label"
          aria-invalid={shown('rating') ? true : undefined}
          onKeyDown={handleStarKeys}
          className="flex items-center gap-1"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}, ${RATING_WORDS[star]}`}
              tabIndex={rating === star || (rating === 0 && star === 1) ? 0 : -1}
              onClick={() => {
                setRating(star);
                touch('rating');
              }}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-gold transition-transform duration-150 hover:scale-110 rounded-md"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill={star <= rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true">
                <path d={STAR} />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink" aria-live="polite">{RATING_WORDS[rating]}</span>
        </div>
        {fieldError('rating')}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <span id="feedback-category-label" className={labelClasses}>What is this about?</span>
        <div role="radiogroup" aria-labelledby="feedback-category-label" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={category === option.value}
              onClick={() => {
                setCategory(option.value);
                touch('category');
              }}
              className={`flex min-h-16 cursor-pointer flex-col items-start justify-center border px-4 py-2 text-left transition-colors duration-200 rounded-md ${
                category === option.value ? 'border-navy bg-paper ring-1 ring-navy' : shown('category') ? 'border-danger' : 'border-line bg-surface hover:border-gold'
              }`}
            >
              <span className="text-base font-bold text-ink">{option.label}</span>
              <span className="text-xs text-muted">{option.hint}</span>
            </button>
          ))}
        </div>
        {fieldError('category')}
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="feedback-message" className={labelClasses}>Your message</label>
        <textarea
          {...a11y('message')}
          rows={5}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what stood out, good or bad…"
          className={inputClasses('message', 'py-2.5')}
        />
        <div className="flex items-start justify-between gap-3">
          {fieldError('message') ?? <span />}
          <span className="shrink-0 text-xs tabular-nums text-muted">{message.length}/{MAX_MESSAGE}</span>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
          <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-5 w-5 shrink-0" />
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 cursor-pointer bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
      >
        {isSubmitting ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  );
}
