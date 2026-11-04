const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/** Read-only stars (filled up to `value`). Announced to screen readers as "4 out of 5 stars". */
export default function StarRating({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex items-center gap-0.5 text-gold">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={className} viewBox="0 0 24 24" aria-hidden="true" fill={star <= Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}
