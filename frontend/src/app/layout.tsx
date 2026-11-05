import type { Metadata } from 'next';
import { Karla, Noto_Sans_Bengali, Playfair_Display } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

// Display serif for headings and big numbers, humanist sans for everything else.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
const karla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
  display: 'swap',
});

// Only used as a fallback for the taka sign (৳), which Playfair and Karla do not contain.
const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
  preload: false, // 100 KB+, only needed for the taka sign: load it when a price is on the page, not on every page
});

export const metadata: Metadata = {
  title: 'InnVibe | Boutique Hotel',
  description: 'InnVibe is a boutique hotel with a pool, a good breakfast and a front desk that never sleeps. Book direct for all-in prices and free cancellation.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${karla.variable} ${notoBengali.variable}`}>
      <body>{children}</body>
    </html>
  );
}
