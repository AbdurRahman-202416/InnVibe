import { proxyToApi } from '@/lib/staff-server';

/** GET /api/staff/subscribers?q= -> newsletter sign-ups for the staff portal. */
export async function GET(request: Request) {
  return proxyToApi(`/newsletter${new URL(request.url).search}`);
}
