/**
 * Format an amount as Bangladeshi taka, e.g. 24035 -> "৳24,035", 123456 -> "৳1,23,456".
 * "en-IN" gives the lakh/crore digit grouping that Bangladesh uses too.
 * The ৳ glyph is not in Playfair/Karla, so the Noto Sans Bengali font (layout.tsx) supplies it.
 */
const takaNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const formatCurrency = (amount: number) => `৳${takaNumber.format(amount)}`;

/** Whole nights between two ISO dates, e.g. ("2026-11-02", "2026-11-05") -> 3. */
export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

/** Format an ISO date ("2026-11-02") as "Nov 2, 2026". */
export const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Shift an ISO date by whole days, e.g. ("2026-11-04", 2) -> "2026-11-06". Works in UTC to avoid timezone drift. */
export const addDays = (isoDate: string, days: number) =>
  new Date(new Date(isoDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Today's date as "YYYY-MM-DD" (UTC). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** True for strings shaped like "2026-11-04" that are real dates. Used to sanitise URL search params. */
export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());

export type StayStatus = 'upcoming' | 'current' | 'past';

/**
 * Where a stay is relative to today: not arrived yet, in the hotel tonight, or already checked out.
 * Same rule the API uses for its "when" filter (check-out day is exclusive).
 */
export const stayStatus = (checkIn: string, checkOut: string): StayStatus => {
  const today = todayIso();
  if (checkIn > today) return 'upcoming';
  if (checkOut > today) return 'current';
  return 'past';
};

/** "Nov 4, 2026, 2:30 PM" in the viewer's timezone. */
export const formatDateTime = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
