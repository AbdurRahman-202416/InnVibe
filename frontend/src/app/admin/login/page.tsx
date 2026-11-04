import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/staff-server';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Staff sign in | InnVibe' };
export const dynamic = 'force-dynamic';

/** Staff login page. Already signed in? Skip straight to the portal. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (await getCurrentStaff()) redirect('/admin');

  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/admin';

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Photo panel, desktop only */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/gallery-dusk.jpg"
          alt="Hotel at dusk reflected in the pool"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent" />
        <p className="absolute inset-x-12 bottom-12 max-w-md font-display text-3xl font-semibold leading-snug text-white">
          Every great stay starts with a great team.
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center bg-navy font-display text-xl font-semibold text-white rounded-md">
              I
              <span className="absolute inset-x-2 bottom-1.5 h-px bg-gold" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Inn<span className="text-gold-ink">Vibe</span>
            </span>
          </Link>

          <h1 className="mt-10 font-display text-3xl font-semibold tracking-tight text-ink">Staff sign in</h1>
          <p className="mt-2 text-base text-muted">This area is for hotel staff only.</p>

          <div className="mt-8">
            <LoginForm next={next} />
          </div>

          <Link href="/" className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline">
            ← Back to the guest website
          </Link>
        </div>
      </div>
    </div>
  );
}
