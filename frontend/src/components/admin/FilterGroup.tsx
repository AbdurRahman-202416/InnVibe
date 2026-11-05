'use client';

import { useId } from 'react';
import Select from '@/components/ui/Select';

interface FilterGroupProps<T extends string> {
  /** Name of the filter, e.g. "Booked via". Shown above the dropdown on phones, and the accessible name on larger screens. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** "Pick one" filter for a list */
export default function FilterGroup<T extends string>({ label, options, value, onChange }: FilterGroupProps<T>) {
  const labelId = useId();

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1.5 md:hidden">
        <span id={labelId} className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
        <Select value={value} onChange={(next) => onChange(next as T)} labelledBy={labelId} options={options} />
      </div>

      <div role="group" aria-label={label} className="hidden max-w-full border border-line bg-surface rounded-md md:inline-flex">
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
    </>
  );
}
