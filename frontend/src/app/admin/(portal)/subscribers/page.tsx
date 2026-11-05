'use client';

import { useCallback, useEffect, useState } from 'react';
import SearchInput from '@/components/admin/SearchInput';
import PageHeader from '@/components/PageHeader';
import StateMessage from '@/components/StateMessage';
import { formatDateTime } from '@/lib/format';
import { getStaffSubscribers } from '@/lib/staff-client';
import type { Subscriber } from '@/lib/types';

const csvCell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Newsletter sign-ups: search by e-mail and download the list as a CSV file. */
export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setIsSearching(true);
    try {
      setSubscribers(await getStaffSubscribers(debouncedQuery));
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not load subscribers. Make sure the NestJS backend is running on port 4000.');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  /** Builds the CSV in the browser from what is on screen (so a search exports just the matches). */
  function exportCsv() {
    const lines = ['E-mail,Subscribed at', ...subscribers.map((row) => `${csvCell(row.email)},${csvCell(row.subscribedAt)}`)];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `innvibe-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasQuery = Boolean(debouncedQuery.trim());

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="People who signed up for offers and news on the website."
        action={
          <button
            type="button"
            onClick={exportCsv}
            disabled={subscribers.length === 0}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-navy px-5 text-sm font-semibold tracking-wide text-navy transition-colors duration-200 hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted rounded-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
            </svg>
            Export CSV
          </button>
        }
      />

      <div className="mb-5 max-w-md">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by e-mail" />
      </div>

      {isLoading && <StateMessage kind="loading" message="Loading subscribers…" />}
      {errorMessage && <StateMessage kind="error" message={errorMessage} />}

      {!isLoading && !errorMessage && (
        <div className={isSearching ? 'opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {hasQuery
              ? `${subscribers.length} ${subscribers.length === 1 ? 'subscriber matches' : 'subscribers match'} your search`
              : `${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'}`}
          </p>

          <div className="overflow-x-auto border border-line bg-surface rounded-lg">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">E-mail</th>
                  <th scope="col" className="px-6 py-4 font-bold">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subscribers.map((row) => (
                  <tr key={row.email} className="transition-colors duration-150 hover:bg-paper">
                    <td className="px-6 py-4 text-base font-semibold text-ink">
                      <a href={`mailto:${row.email}`} className="break-all underline-offset-4 hover:text-gold-ink hover:underline">
                        {row.email}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted">{formatDateTime(row.subscribedAt)}</td>
                  </tr>
                ))}
                {subscribers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-sm text-muted">
                      {hasQuery ? 'No subscribers match your search.' : 'No one has subscribed yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
