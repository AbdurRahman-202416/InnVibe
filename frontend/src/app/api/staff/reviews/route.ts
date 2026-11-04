import { proxyToApi } from '@/lib/staff-server';

/** GET /api/staff/reviews?q=&category=&rating= -> guest feedback for the staff portal. */
export async function GET(request: Request) {
  return proxyToApi(`/reviews${new URL(request.url).search}`);
}
