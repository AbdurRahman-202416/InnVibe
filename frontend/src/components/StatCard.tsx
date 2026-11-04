interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  iconPath: string;
}

/** One flat summary card on the dashboard: small label, big serif number, quiet hint. */
export default function StatCard({ label, value, hint, iconPath }: StatCardProps) {
  return (
    <div className="relative overflow-hidden border border-line bg-surface p-6 rounded-lg">
      {/* thin gold rule along the top edge */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gold" />

      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <svg
            className="h-[18px] w-[18px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={iconPath} />
          </svg>
        </span>
      </div>

      <p className="mt-5 font-display text-5xl font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-3 text-sm text-muted">{hint}</p>
    </div>
  );
}
