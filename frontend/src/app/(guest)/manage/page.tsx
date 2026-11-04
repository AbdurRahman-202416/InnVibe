import type { Metadata } from 'next';
import LookupForm from '@/components/guest/LookupForm';

export const metadata: Metadata = { title: 'My booking | InnVibe' };

/** "My booking": guests find a reservation with the code from their confirmation and their e-mail. */
export default function ManagePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">My booking</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Find your reservation
      </h1>
      <p className="mt-3 text-base text-muted">
        Enter the confirmation code from your booking and the e-mail address you used.
      </p>
      <div className="mt-8 border border-line bg-surface p-6 sm:p-8 rounded-lg">
        <LookupForm />
      </div>
    </div>
  );
}
