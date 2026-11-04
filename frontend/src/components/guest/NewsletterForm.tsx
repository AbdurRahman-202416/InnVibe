'use client';

import { FormEvent, useState } from 'react';
import { subscribeNewsletter } from '@/lib/api';

/** E-mail sign-up for offers and news. Sits on a dark navy band, so the colours are light. */
export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await subscribeNewsletter(email);
      setMessage({
        kind: 'success',
        text: result.alreadySubscribed ? 'You are already on the list. Thank you!' : 'Thanks! You are on the list.',
      });
      setEmail('');
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <label htmlFor="newsletter-email" className="sr-only">
        E-mail address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="newsletter-email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your e-mail address"
          className="min-h-12 w-full border border-white/25 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/60 focus:border-gold focus:ring-2 focus:ring-gold/40 rounded-md"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 shrink-0 cursor-pointer bg-gold px-6 text-sm font-semibold tracking-wide text-navy transition-colors duration-200 hover:bg-gold-soft disabled:cursor-wait disabled:opacity-60 rounded-md"
        >
          {isSubmitting ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      <p
        role={message?.kind === 'error' ? 'alert' : 'status'}
        className={`mt-3 min-h-5 text-sm ${message?.kind === 'error' ? 'text-red-200' : 'text-gold-soft'}`}
      >
        {message?.text}
      </p>
    </form>
  );
}
