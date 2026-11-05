'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/app/admin/login/actions';
import type { StaffUser } from '@/lib/types';

/** Navigation items shown in both the desktop sidebar and the mobile menu. */
const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10',
  },
  {
    href: '/admin/rooms',
    label: 'Rooms',
    icon: 'M3 20V8a2 2 0 012-2h14a2 2 0 012 2v12M3 14h18M7 10h4',
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  },
  {
    href: '/admin/feedback',
    label: 'Feedback',
    icon: 'M8 10h8M8 14h5M21 12a9 9 0 01-13.5 7.8L3 21l1.3-4.4A9 9 0 1121 12z',
  },
  {
    href: '/admin/subscribers',
    label: 'Subscribers',
    icon: 'M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  },
];

/** Small reusable stroke icon so we do not need an icon library. */
function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Logotype: navy monogram with a gold underline, serif wordmark. */
function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center bg-navy font-display text-xl font-semibold text-white rounded-md">
        I
        <span className="absolute inset-x-2 bottom-1.5 h-px bg-gold" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Inn<span className="text-gold-ink">Vibe</span>
      </span>
    </Link>
  );
}

/** The list of links; highlights the one that matches the current URL. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-h-11 items-center gap-3 px-4 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? 'bg-paper text-navy before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gold'
                : 'text-muted hover:bg-paper hover:text-ink'
            }`}
          >
            <Icon path={item.icon} className={`h-5 w-5 ${isActive ? 'text-gold-ink' : ''}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ user }: { user: StaffUser }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-10 border-r border-line bg-surface py-8 lg:flex">
        <div className="px-6">
          <Brand />
        </div>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-3 px-6">
          <div className="border-t border-line pt-5">
            <p className="font-semibold text-ink">{user.name}</p>
            <p className="text-xs tracking-wide text-muted">
              <span className="capitalize">{user.role}</span> · @{user.username}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 w-full cursor-pointer border border-line text-sm font-semibold text-ink transition-colors duration-200 hover:border-gold rounded-md"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
          >
            ← View guest website
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink hover:bg-paper"
          >
            <Icon
              path={isMobileMenuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
              className="h-6 w-6"
            />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-line pb-3 pt-2">
            <NavLinks onNavigate={() => setIsMobileMenuOpen(false)} />
            <Link href="/" className="mt-1 flex min-h-11 items-center px-4 text-sm font-semibold text-gold-ink">
              ← View guest website
            </Link>
            <form action={logoutAction} className="px-4 pt-1">
              <p className="pb-2 text-xs text-muted">
                {user.name} · <span className="capitalize">{user.role}</span>
              </p>
              <button
                type="submit"
                className="min-h-11 w-full cursor-pointer border border-line text-sm font-semibold text-ink hover:border-gold rounded-md"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </header>
    </>
  );
}
