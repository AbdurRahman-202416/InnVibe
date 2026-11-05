export default function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-24">
      <span
        aria-hidden="true"
        className="h-9 w-9 rounded-full border-[3px] border-line border-t-gold-ink motion-safe:animate-spin"
      />
      <p className="text-sm text-muted">{label}...</p>
    </div>
  );
}
