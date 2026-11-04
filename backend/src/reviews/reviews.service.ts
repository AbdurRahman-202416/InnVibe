import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookingsService } from '../bookings/bookings.service';
import { assertText, escapeRegex } from '../common/validation';
import { REVIEW_CATEGORIES, ReviewCategory, ReviewDocument, ReviewEntity } from './review.schema';

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
  average: number; // one decimal, 0 when there are no reviews
  byRating: Record<'1' | '2' | '3' | '4' | '5', number>;
  byCategory: Record<ReviewCategory, number>;
}

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 1000;

/**
 * Guest feedback. A guest proves they are a real guest with the same booking code + e-mail pair as "My booking",
 * and can leave ONE review per booking. Staff can only read reviews (no edit, no delete).
 */
@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(ReviewEntity.name) private readonly reviewModel: Model<ReviewDocument>,
    private readonly bookingsService: BookingsService,
  ) {}

  /** Public: save a guest's review. Returns the guest's name so the thank-you page can greet them. */
  async create(input: Record<string, unknown>): Promise<{ thanks: true; guestName: string }> {
    if (typeof input !== 'object' || input === null) throw new BadRequestException('A JSON body is required');
    assertText(input.code, 'code', { required: true, max: 20 });
    assertText(input.email, 'email', { required: true, max: 254 });
    assertText(input.category, 'category', { required: true, max: 20 });
    assertText(input.message, 'message', { required: true, max: MAX_MESSAGE });

    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('rating must be a whole number from 1 to 5');
    const category = input.category as ReviewCategory;
    if (!REVIEW_CATEGORIES.includes(category)) throw new BadRequestException('category must be praise, suggestion or complaint');
    const message = (input.message as string).trim();
    if (message.length < MIN_MESSAGE) throw new BadRequestException(`Please write at least ${MIN_MESSAGE} characters`);

    // Same proof as "My booking": both the code and the e-mail must match (404 with one shared message otherwise).
    const booking = await this.bookingsService.lookup(input.code as string, input.email as string);

    try {
      await this.reviewModel.create({
        bookingCode: booking.code,
        guestName: booking.guestName,
        roomNumber: booking.roomNumber,
        rating,
        category,
        message,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('You have already shared feedback for this booking. Thank you!');
      }
      throw error;
    }
    return { thanks: true, guestName: booking.guestName };
  }

  /**
   * Staff: newest first, up to 500. Optional filters: q (text in the message, guest name, code or room),
   * category, rating. The summary always covers ALL reviews, whatever the filters.
   */
  async findAll(filters: { q?: unknown; category?: unknown; rating?: unknown } = {}): Promise<{ summary: ReviewSummary; reviews: Review[] }> {
    const { q, category, rating } = filters;
    assertText(q, 'q', { max: 100 });
    assertText(category, 'category', { max: 20 });
    assertText(rating, 'rating', { max: 2 });

    const filter: Record<string, unknown> = {};
    const text = typeof q === 'string' ? q.trim() : '';
    if (text) {
      const pattern = new RegExp(escapeRegex(text), 'i');
      filter.$or = [{ message: pattern }, { guestName: pattern }, { bookingCode: pattern }, { roomNumber: pattern }];
    }
    if (category) {
      if (!REVIEW_CATEGORIES.includes(category as ReviewCategory)) throw new BadRequestException('category must be praise, suggestion or complaint');
      filter.category = category;
    }
    if (rating) {
      const value = Number(rating);
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new BadRequestException('rating must be 1 to 5');
      filter.rating = value;
    }

    const [rows, all] = await Promise.all([
      this.reviewModel.find(filter).sort({ _id: -1 }).limit(500).lean(),
      this.reviewModel.find().select('rating category').lean(),
    ]);

    const summary: ReviewSummary = {
      count: all.length,
      average: all.length ? Math.round((all.reduce((sum, row) => sum + row.rating, 0) / all.length) * 10) / 10 : 0,
      byRating: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      byCategory: { praise: 0, suggestion: 0, complaint: 0 },
    };
    for (const row of all) {
      summary.byRating[String(row.rating) as keyof ReviewSummary['byRating']]++;
      summary.byCategory[row.category]++;
    }

    return {
      summary,
      reviews: rows.map((row) => ({
        id: String(row._id),
        bookingCode: row.bookingCode,
        guestName: row.guestName,
        roomNumber: row.roomNumber,
        rating: row.rating,
        category: row.category,
        message: row.message,
        createdAt: new Date(row.createdAt ?? (row._id as unknown as { getTimestamp(): Date }).getTimestamp()).toISOString(),
      })),
    };
  }
}
