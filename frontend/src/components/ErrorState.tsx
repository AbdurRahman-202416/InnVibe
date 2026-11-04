'use client';

/** Shared "something went wrong" screen for the error.tsx boundaries. `reset` re-renders the failed page. */
export default function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-3 text-base text-muted">We couldn&apos;t load this page. Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 items-center rounded-md bg-navy px-7 text-sm font-semibold text-white hover:bg-navy-hover"
      >
        Try again
      </button>
    </div>
  );
}
