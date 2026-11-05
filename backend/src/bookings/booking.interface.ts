/** Methods an online guest can pay with. */
export type PaymentMethod = 'card' | 'bkash' | 'nagad';

/** How a guest pays at the front desk (chosen by staff). "pay-later" means nothing was collected yet. */
export const FRONT_DESK_PAYMENT_METHODS = ['cash', 'pos', 'bkash', 'nagad', 'bank', 'pay-later'] as const;
export type FrontDeskPaymentMethod = (typeof FRONT_DESK_PAYMENT_METHODS)[number];

/** Whatever is stored on a booking: an online method or a front-desk one. */
type BookingPaymentMethod = PaymentMethod | FrontDeskPaymentMethod;

/** A booking as returned by the API. */
export interface Booking {
  id: string; // MongoDB _id as text
  code: string; // guest-facing confirmation code, e.g. "IV-7K2M9Q"
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  guests: number;
  roomNumber: string;
  checkIn: string; // ISO date, e.g. "2026-11-10"
  checkOut: string; // ISO date (the guest leaves on this day)
  subtotal: number; // BDT, nights x room rate
  serviceCharge: number; // BDT
  vat: number; // BDT
  totalAmount: number; // BDT, subtotal + serviceCharge + vat
  source: 'online' | 'front-desk'; // booked by the guest on the website, or by staff
  paymentMethod?: BookingPaymentMethod;
  paymentReference?: string; // online: generated gateway reference. Front desk: receipt / transaction number typed by staff (optional)
  paymentLast4?: string; // last 4 digits of the card or mobile number. Nothing more is kept.
  status: 'confirmed' | 'cancelled';
  cancelledAt?: string; // ISO timestamp
  cancelReason?: string; // only in the staff list
  cancelledBy?: string; // only in the staff list
}

/** Dummy payment details sent by the guest checkout form. Never stored. */
export type PaymentInput =
  | { method: 'card'; cardholder: string; cardNumber: string; expiry: string; cvc: string }
  | { method: 'bkash' | 'nagad'; mobileNumber: string; pin: string };

/** Body expected by POST /bookings (amounts are calculated by the server). */
export interface CreateBookingInput {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  guests?: number;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  payment?: PaymentInput;
  /** Front-desk bookings only: how the guest pays, and an optional receipt / transaction number. */
  paymentMethod?: string;
  paymentReference?: string; // present for online bookings, absent for front-desk bookings
}
