import Image from 'next/image';

/**
 * Brand marks for the payment method buttons. Files live in public/images/payments
 * (Visa from Wikimedia Commons, bKash from logotyp.us, Nagad from nagad.com.bd, Mastercard circles redrawn).
 *
 * Sizes are responsive: small on phones (three buttons share a narrow row), standard from the `sm` breakpoint up.
 * Only the height is set in CSS (width follows the logo's own proportions), so nothing is stretched or clipped.
 */
const LOGOS = {
  visa: { src: '/images/payments/visa.svg', width: 62, height: 20, size: 'h-3 sm:h-5' },
  mastercard: { src: '/images/payments/mastercard.svg', width: 34, height: 21, size: 'h-3.5 sm:h-5' },
  bkash: { src: '/images/payments/bkash.svg', width: 86, height: 31, size: 'h-5 sm:h-7' },
  nagad: { src: '/images/payments/nagad.png', width: 86, height: 30, size: 'h-5 sm:h-7' },
} as const;

function Logo({ name }: { name: keyof typeof LOGOS }) {
  const logo = LOGOS[name];
  return <Image src={logo.src} alt="" width={logo.width} height={logo.height} unoptimized className={`w-auto max-w-full ${logo.size}`} />;
}

export default function PaymentLogo({ method }: { method: 'card' | 'bkash' | 'nagad' }) {
  if (method === 'bkash') return <Logo name="bkash" />;
  if (method === 'nagad') return <Logo name="nagad" />;
  return (
    <span className="flex items-center gap-1 sm:gap-2">
      <Logo name="visa" />
      <Logo name="mastercard" />
    </span>
  );
}
