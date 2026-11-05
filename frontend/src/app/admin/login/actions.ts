'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { STAFF_COOKIE, STAFF_SESSION_SECONDS } from '@/lib/staff-constants';

export interface LoginState {
  error?: string;
  username?: string;
}

/** Only allow redirects to pages inside /admin (blocks "open redirect" tricks such as //evil.com). */
const safeNext = (value: string) =>
  value.startsWith('/admin') && !value.startsWith('//') && !value.startsWith('/admin/login') ? value : '/admin';

export async function loginAction(_previous: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/admin'));

  if (!username || !password) return { error: 'Enter your username and password', username };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { error: 'Cannot reach the server right now. Please try again in a moment.', username };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { error: body?.message ?? 'Sign in failed', username };
  }

  const { token } = (await response.json()) as { token: string };
  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true, // JavaScript cannot read it
    sameSite: 'lax', // not sent on cross-site POSTs (basic CSRF protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    path: '/',
    maxAge: STAFF_SESSION_SECONDS,
  });

  redirect(next);
}

/** Sign out: delete the cookie and go back to the login page. */
export async function logoutAction() {
  (await cookies()).delete(STAFF_COOKIE);
  redirect('/admin/login');
}
