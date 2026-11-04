'use client';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Visible hint inside the box, and the accessible name of the field. */
  placeholder: string;
}

/** Search box with a magnifier and a clear (X) button. The parent decides when to actually search (e.g. after a pause in typing). */
export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div role="search" className="relative w-full">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="min-h-11 w-full border border-line bg-surface py-2 pl-11 pr-11 text-base text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/25 [&::-webkit-search-cancel-button]:hidden rounded-md"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-paper hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
