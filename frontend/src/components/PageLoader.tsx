/**
 * One loading indicator for the whole app. Used by the loading.tsx files, which Next.js
 * shows automatically while a server page is fetching data (navigation between pages).
 *
 * It is a full screen tall on purpose: the footer sits below it, and when the real page streams in the footer
 * would otherwise jump from under the spinner to the bottom of the page (a big layout shift).
 */
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
