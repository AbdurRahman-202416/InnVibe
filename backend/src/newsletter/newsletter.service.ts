import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { assertText, escapeRegex } from '../common/validation';
import { SubscriberDocument, SubscriberEntity } from './subscriber.schema';

@Injectable()
export class NewsletterService {
  constructor(@InjectModel(SubscriberEntity.name) private readonly subscriberModel: Model<SubscriberDocument>) {}

  /** Newest sign-ups first (staff only). Optional `q` filters by part of the e-mail. At most 1000 rows. */
  async findAll(q?: unknown): Promise<{ email: string; subscribedAt: string }[]> {
    assertText(q, 'q', { max: 100 });
    const text = typeof q === 'string' ? q.trim() : '';
    const filter = text ? { email: new RegExp(escapeRegex(text), 'i') } : {};
    const rows = await this.subscriberModel.find(filter).sort({ _id: -1 }).limit(1000).lean();
    // Older rows may have no subscribedAt; the ObjectId itself contains the creation time.
    return rows.map((row) => ({
      email: row.email,
      subscribedAt: (row.subscribedAt ?? (row as { _id: { getTimestamp(): Date } })._id.getTimestamp()).toISOString(),
    }));
  }

  /** Add an e-mail address. Returns whether it was new. */
  async subscribe(email?: unknown): Promise<{ subscribed: true; alreadySubscribed: boolean }> {
    if (email !== undefined && typeof email !== 'string') throw new BadRequestException('Please enter a valid e-mail address');
    const clean = (email ?? '').trim().toLowerCase();
    // Simple shape check: something@something.tld, no spaces, sane length.
    if (clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      throw new BadRequestException('Please enter a valid e-mail address');
    }
    // One atomic "insert if missing" (no read-then-write gap): upsertedCount is 1 only for a new address.
    const result = await this.subscriberModel.updateOne(
      { email: clean },
      { $setOnInsert: { email: clean, subscribedAt: new Date() } },
      { upsert: true },
    );
    return { subscribed: true, alreadySubscribed: result.upsertedCount === 0 };
  }
}
