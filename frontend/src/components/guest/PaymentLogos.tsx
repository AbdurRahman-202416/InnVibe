import Image from 'next/image';

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
