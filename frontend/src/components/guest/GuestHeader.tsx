import Link from 'next/link';

/** Public website header: logo on the left, two guest links on the right (the staff link lives in the footer). */
export default function GuestHeader() {
  const linkClasses =
    'flex min-h-11 items-center whitespace-nowrap px-2.5 text-sm font-semibold text-ink transition-colors duration-200 hover:text-gold-ink sm:px-3';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center bg-navy font-display text-xl font-semibold text-white rounded-md">
            I
            <span className="absolute inset-x-2 bottom-1.5 h-px bg-gold" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Inn<span className="text-gold-ink">Vibe</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/rooms" className={`${linkClasses} hidden sm:flex`}>
            Rooms
          </Link>
          <Link href="/manage" className={linkClasses}>
            My booking
          </Link>
          <Link
            href="/rooms"
            className="ml-1 flex min-h-11 items-center whitespace-nowrap rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-navy-hover"
          >
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}
