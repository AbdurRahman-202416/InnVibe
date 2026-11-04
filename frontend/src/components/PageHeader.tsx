import type { ReactNode } from 'react';

/** Page title + subtitle, with an optional action (e.g. a button) on the right. */
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
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
