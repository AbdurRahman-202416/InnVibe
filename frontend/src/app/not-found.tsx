import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found | InnVibe' };

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-xl font-semibold text-ink">
        Inn<span className="text-gold-ink">Vibe</span>
      </p>
      <p className="mt-10 font-display text-7xl font-semibold text-gold-ink">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-3 max-w-md text-base text-muted">The page you are looking for may have moved or never existed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-navy px-7 text-sm font-semibold text-white hover:bg-navy-hover">
          Back to home
        </Link>
        <Link href="/rooms" className="inline-flex min-h-11 items-center rounded-md border border-line px-7 text-sm font-semibold text-ink hover:bg-surface">
          View rooms
        </Link>
      </div>
    </main>
  );
}
