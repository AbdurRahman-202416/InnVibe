'use client';

interface FilterGroupProps<T extends string> {
  /** Accessible name of the group, e.g. "Booking source". */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Segmented "pick one" control (like tabs, but for filtering a list). */
export default function FilterGroup<T extends string>({ label, options, value, onChange }: FilterGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto border border-line bg-surface rounded-md">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap px-3.5 text-sm font-semibold transition-colors duration-200 ${
            value === option.value ? 'bg-navy text-white' : 'text-muted hover:bg-paper hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
