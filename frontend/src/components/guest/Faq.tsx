const FAQS = [
  {
    question: 'What time are check-in and check-out?',
    answer: 'Check-in is from 2:00 pm and check-out is until 12:00 noon. Need earlier or later? Add it under special requests when you book.',
  },
  {
    question: 'How can I pay?',
    answer: 'By card, bKash or Nagad at checkout. Your payment is confirmed instantly and your confirmation code appears right after.',
  },
  {
    question: 'Are taxes included in the price?',
    answer: 'Room rates are per night. A 10% service charge and 15% VAT are added, and the all-in total is shown in the search results and again before you pay. There are no other fees.',
  },
  {
    question: 'Can I cancel my booking?',
    answer: 'Our policy is free cancellation up to 24 hours before check-in. Later cancellations are charged the first night. To cancel, contact our front desk with your confirmation code.',
  },
  {
    question: 'How do I find my booking later?',
    answer: 'Use "My booking" at the top of the page and enter your confirmation code and the e-mail you booked with.',
  },
  {
    question: 'Can you arrange an airport pickup?',
    answer: 'Yes. Mention your flight details under special requests while booking and our front desk will confirm the pickup with you.',
  },
];

/**
 * FAQ list built with the native <details>/<summary> elements:
 * keyboard accessible and works without any JavaScript.
 */
export default function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {FAQS.map((item) => (
        <details key={item.question} className="group py-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <svg
              className="h-5 w-5 shrink-0 text-gold-ink transition-transform duration-200 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p className="pb-5 pr-9 text-base leading-relaxed text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
