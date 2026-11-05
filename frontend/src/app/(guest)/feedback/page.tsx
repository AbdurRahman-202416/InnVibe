import type { Metadata } from 'next';
import FeedbackForm from '@/components/guest/FeedbackForm';

export const metadata: Metadata = { title: 'Share your feedback | InnVibe' };

/** Guest feedback: praise, suggestions or complaints, tied to a booking. /feedback?code=IV-XXXXXX pre-fills the code. */
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const code = typeof params.code === 'string' && /^IV-[A-Za-z0-9]{6}$/.test(params.code) ? params.code : '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Tell us about your stay</h1>
      <p className="mt-3 text-base text-muted">
        Praise, an idea or a problem: our team reads every message. Use the booking code and the e-mail from your confirmation.
      </p>
      <div className="mt-8 border border-line bg-surface p-6 sm:p-8 rounded-lg">
        <FeedbackForm defaultCode={code} />
      </div>
    </div>
  );
}
