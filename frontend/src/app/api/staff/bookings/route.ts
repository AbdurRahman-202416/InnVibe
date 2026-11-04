import { proxyToApi } from '@/lib/staff-server';

/** GET /api/staff/bookings?q=&source=&when= -> forwards to the API (query string included) with the staff token from the cookie. */
export async function GET(request: Request) {
  return proxyToApi(`/bookings${new URL(request.url).search}`);
}

/** POST /api/staff/bookings -> front-desk booking (needs a valid staff session). */
export async function POST(request: Request) {
  return proxyToApi('/bookings', { method: 'POST', body: await request.text() });
}
