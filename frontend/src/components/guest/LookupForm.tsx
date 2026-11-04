'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { lookupBooking } from '@/lib/api';

/** "My booking" form: confirmation code + e-mail, then jump to the confirmation page. */
export default function LookupForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const booking = await lookupBooking(code, email);
      router.push(`/confirmation/${booking.code}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  }

  const labelClasses = 'flex flex-col gap-1.5 text-sm font-semibold text-ink';
  const inputClasses =
    'min-h-11 w-full border border-line bg-surface px-3.5 text-base font-normal text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/25 rounded-md';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className={labelClasses}>
        Confirmation code
        <input
          required
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="IV-XXXXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClasses} tracking-widest tabular-nums`}
        />
      </label>
      <label className={labelClasses}>
        E-mail used for the booking
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          className={inputClasses}
        />
      </label>

      {errorMessage && (
        <p role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 cursor-pointer bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
      >
        {isSubmitting ? 'Searching…' : 'Find my booking'}
      </button>
    </form>
  );
}
