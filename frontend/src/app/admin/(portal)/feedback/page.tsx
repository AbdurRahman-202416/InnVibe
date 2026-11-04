'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import FilterGroup from '@/components/admin/FilterGroup';
import SearchInput from '@/components/admin/SearchInput';
import PageHeader from '@/components/PageHeader';
import StarRating from '@/components/StarRating';
import StateMessage from '@/components/StateMessage';
import Select from '@/components/ui/Select';
import { formatDateTime } from '@/lib/format';
import { getStaffReviews, type ReviewFilters } from '@/lib/staff-client';
import type { Review, ReviewCategory, ReviewSummary } from '@/lib/types';

type CategoryFilter = NonNullable<ReviewFilters['category']>;
type RatingFilter = NonNullable<ReviewFilters['rating']>;

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'praise', label: 'Praise' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'complaint', label: 'Complaint' },
];
const RATING_OPTIONS = [
  { value: '', label: 'All ratings' },
  ...[5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars} star${stars > 1 ? 's' : ''}` })),
];
const CATEGORY_STYLE: Record<ReviewCategory, { label: string; dot: string }> = {
  praise: { label: 'Praise', dot: 'bg-success' },
  suggestion: { label: 'Suggestion', dot: 'bg-gold' },
  complaint: { label: 'Complaint', dot: 'bg-danger' },
};

/**
 * Guest feedback (read-only). Staff can search and filter it, and jump to the booking it belongs to,
 * but cannot edit or delete a review: there is no such route in the API.
 */
export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('');
  const [rating, setRating] = useState<RatingFilter>('');
  const hasFilters = Boolean(debouncedQuery.trim() || category || rating);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setIsSearching(true);
    try {
      const result = await getStaffReviews({ q: debouncedQuery.trim(), category, rating });
      setReviews(result.reviews);
      setSummary(result.summary);
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not load feedback. Make sure the NestJS backend is running on port 4000.');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [debouncedQuery, category, rating]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setCategory('');
    setRating('');
  };

  return (
    <>
      <PageHeader title="Feedback" subtitle="Praise, suggestions and complaints from guests. Read-only: feedback cannot be edited or deleted." />

      {summary && summary.count > 0 && (
        <section aria-label="Feedback summary" className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr_1fr]">
          <div className="border border-line bg-surface p-6 rounded-lg">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Average rating</p>
            <p className="mt-3 font-display text-5xl font-semibold leading-none text-ink">{summary.average.toFixed(1)}</p>
            <div className="mt-3"><StarRating value={summary.average} className="h-5 w-5" /></div>
            <p className="mt-2 text-sm text-muted">from {summary.count} review{summary.count > 1 ? 's' : ''}</p>
          </div>

          <div className="border border-line bg-surface p-6 rounded-lg">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Ratings</p>
            <ul className="mt-3 flex flex-col gap-2">
              {([5, 4, 3, 2, 1] as const).map((stars) => {
                const count = summary.byRating[String(stars) as keyof ReviewSummary['byRating']];
                return (
                  <li key={stars} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-muted">{stars} star{stars > 1 ? 's' : ''}</span>
                    <span className="h-2 flex-1 overflow-hidden bg-line rounded-full">
                      <span className="block h-full bg-gold" style={{ width: `${(count / summary.count) * 100}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-right tabular-nums text-ink">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border border-line bg-surface p-6 rounded-lg">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">By type</p>
            <ul className="mt-3 flex flex-col gap-3">
              {(Object.keys(CATEGORY_STYLE) as ReviewCategory[]).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CATEGORY_STYLE[key].dot}`} />
                    {CATEGORY_STYLE[key].label}
                  </span>
                  <span className={`font-display text-2xl font-semibold tabular-nums ${key === 'complaint' && summary.byCategory[key] > 0 ? 'text-danger' : 'text-ink'}`}>
                    {summary.byCategory[key]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="xl:max-w-md xl:flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search message, guest, code or room" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup label="Type" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <div className="w-40">
            <span id="rating-filter-label" className="sr-only">Rating</span>
            <Select value={rating} onChange={(value) => setRating(value as RatingFilter)} options={RATING_OPTIONS} labelledBy="rating-filter-label" />
          </div>
        </div>
      </div>

      {isLoading && <StateMessage kind="loading" message="Loading feedback…" />}
      {errorMessage && <StateMessage kind="error" message={errorMessage} />}

      {!isLoading && !errorMessage && (
        <div className={isSearching ? 'opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {hasFilters
              ? `${reviews.length} ${reviews.length === 1 ? 'review matches' : 'reviews match'} your search`
              : `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}
          </p>

          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review.id} className="border border-line bg-surface p-5 sm:p-6 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <StarRating value={review.rating} className="h-5 w-5" />
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CATEGORY_STYLE[review.category].dot}`} />
                      {CATEGORY_STYLE[review.category].label}
                    </span>
                  </div>
                  <time dateTime={review.createdAt} className="text-sm text-muted">{formatDateTime(review.createdAt)}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">{review.message}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted">
                  <p>
                    <span className="font-semibold text-ink">{review.guestName}</span> · Room {review.roomNumber} ·{' '}
                    <span className="tabular-nums">{review.bookingCode}</span>
                  </p>
                  <Link
                    href={`/admin/bookings?q=${encodeURIComponent(review.bookingCode)}`}
                    className="inline-flex min-h-11 items-center font-semibold text-gold-ink underline-offset-4 hover:underline"
                  >
                    View booking
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {reviews.length === 0 && (
            <div className="border border-line bg-surface p-8 text-center rounded-lg">
              <p className="text-sm text-muted">{hasFilters ? 'No feedback matches your search.' : 'No feedback yet. It will appear here as guests send it.'}</p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="mt-3 min-h-11 cursor-pointer text-sm font-semibold text-gold-ink underline underline-offset-4 hover:text-ink">
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
