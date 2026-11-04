import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** A booking in MongoDB (collection "bookings"). Dates are kept as "YYYY-MM-DD" strings, which sort and compare correctly. */
@Schema({ collection: 'bookings', versionKey: false })
export class BookingEntity {
  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String, required: true })
  guestName: string;

  @Prop({ type: String })
  guestEmail?: string;

  @Prop({ type: String })
  guestPhone?: string;

  @Prop({ type: String })
  specialRequests?: string;

  @Prop({ type: Number, required: true })
  guests: number;

  @Prop({ type: String, required: true })
  roomNumber: string;

  @Prop({ type: String, required: true })
  checkIn: string;

  @Prop({ type: String, required: true })
  checkOut: string;

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  serviceCharge: number;

  @Prop({ type: Number, required: true })
  vat: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, required: true, enum: ['online', 'front-desk'] })
  source: 'online' | 'front-desk';

  @Prop({ type: String, enum: ['card', 'bkash', 'nagad', 'cash', 'pos', 'bank', 'pay-later'] })
  paymentMethod?: 'card' | 'bkash' | 'nagad' | 'cash' | 'pos' | 'bank' | 'pay-later';

  @Prop({ type: String })
  paymentReference?: string;

  @Prop({ type: String })
  paymentLast4?: string;

  /** Old rows have no status; they count as confirmed. Bookings are never deleted, only cancelled (kept for the record). */
  @Prop({ type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' })
  status?: 'confirmed' | 'cancelled';

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String })
  cancelReason?: string; // staff only, never sent to guests

  @Prop({ type: String })
  cancelledBy?: string; // staff username, staff only
}

export type BookingDocument = HydratedDocument<BookingEntity>;
export const BookingSchema = SchemaFactory.createForClass(BookingEntity);
// Speeds up the "is this room free for these dates" overlap query.
BookingSchema.index({ roomNumber: 1, checkIn: 1, checkOut: 1 });

/**
 * One document per room per NIGHT that is taken (collection "roomnights").
 * The unique index on (roomNumber, date) is what makes double-booking impossible even when two guests
 * press "Pay" at the same moment: the database itself refuses the second insert, no matter how many
 * API instances are running. (A plain "check, then save" would let both through.)
 */
@Schema({ collection: 'roomnights', versionKey: false })
export class RoomNightEntity {
  @Prop({ type: String, required: true })
  roomNumber: string;

  @Prop({ type: String, required: true })
  date: string; // the night that starts on this day, "YYYY-MM-DD"

  @Prop({ type: String, required: true, index: true })
  bookingKey: string; // groups the nights of one booking attempt, used to roll them back
}

export type RoomNightDocument = HydratedDocument<RoomNightEntity>;
export const RoomNightSchema = SchemaFactory.createForClass(RoomNightEntity);
RoomNightSchema.index({ roomNumber: 1, date: 1 }, { unique: true });
