import type { ReactNode } from 'react';

/** Page title + subtitle, with an optional action (e.g. a button) on the right. */
export default function PageHeader({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  /** Tighter spacing (used by pages that keep the top section fixed and scroll only their list). */
  compact?: boolean;
}) {
  return (
    <div className={`flex shrink-0 flex-col gap-5 border-b border-line sm:flex-row sm:items-end sm:justify-between ${compact ? 'mb-5 pb-4' : 'mb-10 pb-6'}`}>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-base text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
