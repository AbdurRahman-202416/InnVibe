import Image from 'next/image';

/**
 * Brand marks for the payment method buttons. Files live in public/images/payments
 * (Visa from Wikimedia Commons, bKash from logotyp.us, Nagad from nagad.com.bd, Mastercard circles redrawn).
 * Each logo is shown at a fixed height so the three buttons line up.
 */
const LOGOS = {
  visa: { src: '/images/payments/visa.svg', width: 62, height: 20 },
  mastercard: { src: '/images/payments/mastercard.svg', width: 34, height: 21 },
  bkash: { src: '/images/payments/bkash.svg', width: 86, height: 31 },
  nagad: { src: '/images/payments/nagad.png', width: 86, height: 30 },
} as const;

function Logo({ name }: { name: keyof typeof LOGOS }) {
  const logo = LOGOS[name];
  return <Image src={logo.src} alt="" width={logo.width} height={logo.height} unoptimized />;
}

export default function PaymentLogo({ method }: { method: 'card' | 'bkash' | 'nagad' }) {
  if (method === 'bkash') return <Logo name="bkash" />;
  if (method === 'nagad') return <Logo name="nagad" />;
  return (
    <span className="flex items-center gap-2">
      <Logo name="visa" />
      <Logo name="mastercard" />
    </span>
  );
}
