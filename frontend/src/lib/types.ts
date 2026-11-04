/** These mirror the interfaces returned by the NestJS API. All money is in Bangladeshi taka (BDT). */

/** A room from the catalogue (what it is, not whether it is free). */
export interface Room {
  id: number;
  roomNumber: string;
  type: 'Single' | 'Double' | 'Deluxe' | 'Suite';
  pricePerNight: number;
  capacity: number;
  description: string;
  image: string;
  gallery: string[];
  size: number;
  bed: string;
  view: string;
  amenities: string[];
}

/** A room plus whether it is free for the requested dates. */
export interface RoomAvailability extends Room {
  isAvailable: boolean;
}

/** Methods an online guest can pay with. */
export type PaymentMethod = 'card' | 'bkash' | 'nagad';

/** How a guest pays at the front desk (chosen by staff). "pay-later" = nothing collected yet. */
export type FrontDeskPaymentMethod = 'cash' | 'pos' | 'bkash' | 'nagad' | 'bank' | 'pay-later';

/** Whatever is stored on a booking. */
export type BookingPaymentMethod = PaymentMethod | FrontDeskPaymentMethod;

export interface Booking {
  id: string;
  code: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  guests: number;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  subtotal: number;
  serviceCharge: number;
  vat: number;
  totalAmount: number;
  source: 'online' | 'front-desk';
  paymentMethod?: BookingPaymentMethod;
  paymentReference?: string;
  paymentLast4?: string;
  status: 'confirmed' | 'cancelled';
  cancelledAt?: string;
  cancelReason?: string; // staff list only
  cancelledBy?: string; // staff list only
}

/** Price breakdown calculated by the server (GET /bookings/quote). */
export interface Pricing {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  serviceCharge: number;
  vat: number;
  totalAmount: number;
}

/** Dummy payment details from the guest checkout form. */
export type PaymentInput =
  | { method: 'card'; cardholder: string; cardNumber: string; expiry: string; cvc: string }
  | { method: 'bkash' | 'nagad'; mobileNumber: string; pin: string };

export interface NewBookingInput {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  guests?: number;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  payment?: PaymentInput;
  paymentMethod?: FrontDeskPaymentMethod; // front-desk bookings: how the guest pays
  paymentReference?: string; // front-desk bookings: optional receipt / transaction number
}

export type ReviewCategory = 'praise' | 'suggestion' | 'complaint';

/** Guest feedback as the staff see it. */
export interface Review {
  id: string;
  bookingCode: string;
  guestName: string;
  roomNumber: string;
  rating: number;
  category: ReviewCategory;
  message: string;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  average: number;
  byRating: Record<'1' | '2' | '3' | '4' | '5', number>;
  byCategory: Record<ReviewCategory, number>;
}

/** A newsletter sign-up (staff view). */
export interface Subscriber {
  email: string;
  subscribedAt: string; // ISO timestamp
}

export interface StaffUser {
  username: string;
  name: string;
  role: 'admin' | 'receptionist';
}
