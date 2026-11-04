import type { ReactNode } from 'react';
import GuestFooter from '@/components/guest/GuestFooter';
import GuestHeader from '@/components/guest/GuestHeader';

/** Layout of the public guest website: header, page, footer. */
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GuestHeader />
      <main>{children}</main>
      <GuestFooter />
    </>
  );
}
