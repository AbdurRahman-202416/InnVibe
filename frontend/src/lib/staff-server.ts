import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { API_URL } from './api';
import { STAFF_COOKIE } from './staff-constants';
import type { Booking, StaffUser } from './types';

/**
 * Server-only helpers for the staff portal.
 * The staff token lives in an httpOnly cookie, so browser JavaScript can never read it
 * (an XSS bug cannot steal it). Only code running on the Next.js server reads the cookie
 * and forwards it to the NestJS API as a Bearer token.
 */
export async function getStaffToken(): Promise<string | undefined> {
  return (await cookies()).get(STAFF_COOKIE)?.value;
}

/** Ask the API who the cookie's token belongs to. null = not signed in (missing, expired or forged). */
export async function getCurrentStaff(): Promise<StaffUser | null> {
  const token = await getStaffToken();
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok ? ((await response.json()) as StaffUser) : null;
  } catch {
    return null;
  }
}

/** Staff-only bookings list for server components. Redirects to the login page on 401. */
export async function getStaffBookings(): Promise<Booking[]> {
  const token = await getStaffToken();
  if (!token) redirect('/admin/login');

  const response = await fetch(`${API_URL}/bookings`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) redirect('/admin/login');
  if (!response.ok) throw new Error(`Could not load bookings (${response.status})`);
  return (await response.json()) as Booking[];
}

/**
 * Same-origin proxy used by the browser: it adds the Bearer token from the cookie and returns
 * the API's status and body unchanged. Used by the /api/staff/* route handlers.
 */
export async function proxyToApi(path: string, init?: RequestInit): Promise<NextResponse> {
  const token = await getStaffToken();
  if (!token) return NextResponse.json({ message: 'Please sign in' }, { status: 401 });

  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'The hotel API is not reachable' }, { status: 502 });
  }
}
