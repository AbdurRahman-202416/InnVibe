/** Red message with an icon, shown under a field */
export default function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="animate-modal-in flex items-start gap-1.5 text-sm text-danger">
      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </p>
  );
}
