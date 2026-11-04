/** Reusable loading / error placeholder shown while data is not ready. */
export default function StateMessage({
  kind,
  message,
}: {
  kind: 'loading' | 'error';
  message: string;
}) {
  const isError = kind === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`border p-5 text-sm ${
        isError
          ? 'border-danger/30 bg-danger/5 text-danger'
          : 'animate-pulse border-line bg-surface text-muted'
      } rounded-lg`}
    >
      {message}
    </div>
  );
}
