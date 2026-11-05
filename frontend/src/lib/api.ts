import { Booking, NewBookingInput, Pricing, Room, RoomAvailability } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    // NestJS error shape: { message: string | string[], statusCode, error }
    const errorBody = await response.json().catch(() => null);
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : errorBody?.message;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const getRooms = () => request<Room[]>('/rooms');

/** Every room flagged with isAvailable for a stay. No dates = "free tonight?". */
export const getAvailability = (checkIn?: string, checkOut?: string) => {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  const query = params.toString();
  return request<RoomAvailability[]>(`/bookings/availability${query ? `?${query}` : ''}`);
};

/** Server-calculated price breakdown (rate, service charge, VAT, total) for a stay in one room. */
export const getQuote = (roomNumber: string, checkIn: string, checkOut: string) =>
  request<Pricing>(`/bookings/quote?${new URLSearchParams({ roomNumber, checkIn, checkOut })}`);

/** One booking by its confirmation code (guest confirmation page). */
export const getBookingByCode = (code: string) =>
  request<Booking>(`/bookings/${encodeURIComponent(code)}`);

/** Guest booking with a dummy payment (public endpoint). Staff bookings go through lib/staff-client.ts. */
export const createBooking = (input: NewBookingInput) =>
  request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) });

/** Sign up for offers and news (public). */
export const subscribeNewsletter = (email: string) =>
  request<{ subscribed: true; alreadySubscribed: boolean }>('/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

/** "My booking": one search text, a confirmation code, e-mail or mobile number. Returns the matching bookings (newest first). */
export const lookupBookings = (query: string) =>
  request<Booking[]>('/bookings/lookup', { method: 'POST', body: JSON.stringify({ query }) });

/** A guest leaves feedback. Proven with the booking code + the e-mail used for the booking. One review per booking. */
export const submitReview = (input: { code: string; email: string; rating: number; category: string; message: string }) =>
  request<{ thanks: true; guestName: string }>('/reviews', { method: 'POST', body: JSON.stringify(input) });
