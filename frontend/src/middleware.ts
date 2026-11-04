import { NextRequest, NextResponse } from 'next/server';
import { STAFF_COOKIE } from '@/lib/staff-constants';

/**
 * First gate for the staff portal: no session cookie -> go to the login page.
 * This only checks that a cookie EXISTS (fast, runs before rendering). The real check,
 * "is the token valid?", happens in the admin layout, which asks the API (/auth/me).
 * And the API itself rejects every staff request without a valid token, so even if someone
 * skipped both frontend checks, the data would still be protected.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();

  if (!request.cookies.has(STAFF_COOKIE)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
