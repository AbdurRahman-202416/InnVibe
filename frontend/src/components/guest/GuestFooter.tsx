import Link from 'next/link';

const linkClasses = 'flex min-h-9 items-center text-sm text-muted transition-colors duration-200 hover:text-ink';

/** Public website footer: brand blurb plus three link columns, like larger hotel sites. */
export default function GuestFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">
            Inn<span className="text-gold-ink">Vibe</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A quiet boutique hotel with a pool, a good breakfast and a front desk that never sleeps.
          </p>
        </div>

        <nav aria-label="Explore">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Explore</p>
          <ul className="mt-3">
            <li><Link href="/rooms" className={linkClasses}>Rooms &amp; suites</Link></li>
            <li><Link href="/#why-direct" className={linkClasses}>Why book direct</Link></li>
            <li><Link href="/#facilities" className={linkClasses}>Facilities</Link></li>
            <li><Link href="/#faq" className={linkClasses}>FAQ</Link></li>
          </ul>
        </nav>

        <nav aria-label="Guest services">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Guest services</p>
          <ul className="mt-3">
            <li><Link href="/manage" className={linkClasses}>My booking</Link></li>
            <li><Link href="/feedback" className={linkClasses}>Share feedback</Link></li>
            <li><Link href="/#newsletter" className={linkClasses}>Offers &amp; news</Link></li>
            <li><Link href="/admin" className={linkClasses}>Staff portal</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Contact</p>
          <address className="mt-3 text-sm not-italic leading-relaxed text-muted">
            Front desk, open 24 hours
            <br />
            +880 2 5566 7788
            <br />
            reservations@innvibe.com
            <br />
            12 Lakeview Road, Gulshan, Dhaka 1212
          </address>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted sm:px-8">
          &copy; {new Date().getFullYear()} InnVibe Hotels. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
