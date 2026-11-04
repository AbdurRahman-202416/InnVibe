import type { Booking, NewBookingInput, Review, ReviewSummary, Subscriber } from './types';

/**
 * Browser-side calls for the staff portal. They go to our OWN Next.js server (/api/staff/*),
 * which attaches the secret token from the httpOnly cookie. If the session has expired (401)
 * we send the user to the login page.
 */
async function staffRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/staff${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 401) {
    window.location.assign('/admin/login');
    throw new Error('Please sign in');
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = Array.isArray(errorBody?.message) ? errorBody.message.join(', ') : errorBody?.message;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface BookingFilters {
  q?: string;
  source?: 'online' | 'front-desk' | '';
  when?: 'upcoming' | 'current' | 'past' | '';
  status?: 'confirmed' | 'cancelled' | '';
}

/** Staff bookings list, optionally filtered. Empty filters are left out of the URL. */
export const getStaffBookingsClient = (filters: BookingFilters = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return staffRequest<Booking[]>(`/bookings${query ? `?${query}` : ''}`);
};

/** Cancel a booking with a reason. The room becomes bookable again straight away. */
export const cancelStaffBooking = (code: string, reason: string) =>
  staffRequest<Booking>(`/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });

export interface ReviewFilters {
  q?: string;
  category?: 'praise' | 'suggestion' | 'complaint' | '';
  rating?: '1' | '2' | '3' | '4' | '5' | '';
}

/** Guest feedback (newest first) plus an overall summary. */
export const getStaffReviews = (filters: ReviewFilters = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return staffRequest<{ summary: ReviewSummary; reviews: Review[] }>(`/reviews${query ? `?${query}` : ''}`);
};

/** Newsletter sign-ups (newest first), optionally filtered by part of the e-mail. */
export const getStaffSubscribers = (q = '') =>
  staffRequest<Subscriber[]>(`/subscribers${q.trim() ? `?${new URLSearchParams({ q: q.trim() })}` : ''}`);

/** Front-desk booking (no payment object). The API only accepts it from a signed-in staff member. */
export const createStaffBooking = (input: NewBookingInput) =>
  staffRequest<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) });
