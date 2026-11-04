import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const REVIEW_CATEGORIES = ['praise', 'suggestion', 'complaint'] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

/**
 * Guest feedback in MongoDB (collection "reviews").
 * A review is never edited or deleted by anyone: there are simply no routes for it. The unique index on
 * bookingCode allows exactly one review per booking.
 */
@Schema({ collection: 'reviews', versionKey: false })
export class ReviewEntity {
  @Prop({ type: String, required: true, unique: true })
  bookingCode: string;

  @Prop({ type: String, required: true })
  guestName: string; // copied from the booking, so the staff list needs no extra lookup

  @Prop({ type: String, required: true })
  roomNumber: string;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, required: true, enum: REVIEW_CATEGORIES })
  category: ReviewCategory;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;
}

export type ReviewDocument = HydratedDocument<ReviewEntity>;
export const ReviewSchema = SchemaFactory.createForClass(ReviewEntity);
