import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { getCurrentStaff } from '@/lib/staff-server';

export const metadata: Metadata = { title: 'InnVibe Staff Portal' };

/** Staff portal layout (every page in this route group is behind login) */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentStaff();
  if (!user) redirect('/admin/login');

  return (
    <>
      <Sidebar user={user} />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-10 lg:py-12">{children}</div>
      </main>
    </>
  );
}
