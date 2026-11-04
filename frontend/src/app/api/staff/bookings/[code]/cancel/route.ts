import { proxyToApi } from '@/lib/staff-server';

/** POST /api/staff/bookings/IV-XXXXXX/cancel { reason } -> cancels the booking (staff session required). */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return proxyToApi(`/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: await request.text() });
}
