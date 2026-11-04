import Link from 'next/link';

/** Shown when a guest page calls notFound() (unknown room number or confirmation code). Header and footer stay. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-8">
      <p className="font-display text-6xl font-semibold text-gold-ink">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-base text-muted">
        The room or booking you asked for does not exist. Check the number or confirmation code and try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-navy px-7 text-sm font-semibold text-white hover:bg-navy-hover">
          Back to home
        </Link>
        <Link href="/manage" className="inline-flex min-h-11 items-center rounded-md border border-line px-7 text-sm font-semibold text-ink hover:bg-surface">
          Find my booking
        </Link>
      </div>
    </div>
  );
}
