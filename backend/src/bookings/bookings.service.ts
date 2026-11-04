import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Room, RoomAvailability } from '../rooms/room.interface';
import { RoomsService } from '../rooms/rooms.service';
import { assertText, escapeRegex } from '../common/validation';
import { Booking, CreateBookingInput } from './booking.interface';
import { BookingDocument, BookingEntity, RoomNightDocument, RoomNightEntity } from './booking.schema';
import { PaymentsService } from './payments.service';
import { calculatePricing, Pricing } from './pricing';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Today's date as "YYYY-MM-DD", moved by `offsetDays` (used for seed data and defaults). */
const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);

/** MongoDB duplicate-key error (a unique index refused the write). */
const isDuplicateKey = (error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

/**
 * Turns a database row into the API shape: `_id` becomes a text `id`, a missing status means "confirmed".
 * The cancel reason and who cancelled are internal, so they are only included for the staff list.
 */
const toBooking = (row: BookingEntity & { _id: unknown }, forStaff = false): Booking => {
  const { _id, status, cancelledAt, cancelReason, cancelledBy, ...rest } = row;
  return {
    id: String(_id),
    ...rest,
    status: status ?? 'confirmed',
    ...(cancelledAt ? { cancelledAt: new Date(cancelledAt).toISOString() } : {}),
    ...(forStaff && status === 'cancelled' ? { cancelReason, cancelledBy } : {}),
  };
};

/** Cancelled bookings no longer hold a room. */
const NOT_CANCELLED = { $ne: 'cancelled' as const };

/**
 * BookingsService owns every booking rule. Bookings live in MongoDB (collections "bookings" and "roomnights").
 *  1. input must be complete and dates must be valid (and not in the past)
 *  2. the room must exist and fit the number of guests
 *  3. the room must be free for the WHOLE stay (date-range overlap check)
 *  4. the nights are then reserved atomically (unique index), so two simultaneous guests cannot both win
 *  5. amounts (rate x nights + service charge + VAT) are calculated here, never trusted from the client
 *  6. online bookings are "paid" through the PaymentsService, only after the nights are held
 */
@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(BookingEntity.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(RoomNightEntity.name) private readonly nightModel: Model<RoomNightDocument>,
    private readonly roomsService: RoomsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * First start against an empty database: add three sample bookings so the staff dashboard is not empty.
   * Dates are relative to the day of that first start.
   */
  async onModuleInit(): Promise<void> {
    if ((await this.bookingModel.estimatedDocumentCount()) > 0) return;
    await this.roomsService.ensureSeeded();

    await this.seed('IV-4F8K2A', 'Ayesha Rahman', '201', 2, -1, 2, 'front-desk');
    await this.seed('IV-9M3QX7', 'Daniel Carter', '302', 2, 0, 4, 'front-desk');
    await this.seed('IV-2B7TY5', 'Sofia Alvarez', '101', 1, 5, 8, 'online', 'sofia@example.com');
    this.logger.log('Seeded 3 sample bookings');
  }

  /**
   * Bookings for the staff portal, oldest first. All filters are optional:
   *  - q:      text that must appear in the code, guest name, e-mail, phone or room number (case-insensitive)
   *  - source: "online" (website) or "front-desk"
   *  - when:   "upcoming" (not arrived yet), "current" (in-house tonight) or "past" (already checked out); cancelled bookings are left out
   *  - status: "confirmed" or "cancelled"
   * Everything the user types is validated and regex-escaped before it reaches MongoDB.
   */
  async findAll(filters: { q?: unknown; source?: unknown; when?: unknown; status?: unknown } = {}): Promise<Booking[]> {
    const { q, source, when, status } = filters;
    assertText(q, 'q', { max: 100 });
    assertText(source, 'source', { max: 20 });
    assertText(when, 'when', { max: 20 });
    assertText(status, 'status', { max: 20 });

    const filter: Record<string, unknown> = {};

    const text = typeof q === 'string' ? q.trim() : '';
    if (text) {
      // "+8801712345678" and "8801712345678" are the same number as "01712345678".
      const phoneText = /^\+?880\d+$/.test(text) ? text.replace(/^\+?880/, '0') : text;
      const pattern = new RegExp(escapeRegex(text), 'i');
      filter.$or = [
        { code: pattern },
        { guestName: pattern },
        { guestEmail: pattern },
        { guestPhone: new RegExp(escapeRegex(phoneText), 'i') },
        { roomNumber: pattern },
      ];
    }

    if (source !== undefined && source !== '') {
      if (source !== 'online' && source !== 'front-desk') throw new BadRequestException('source must be online or front-desk');
      filter.source = source;
    }

    if (when !== undefined && when !== '' && when !== 'all') {
      const today = isoDay(0);
      if (when === 'upcoming') Object.assign(filter, { checkIn: { $gt: today } });
      else if (when === 'current') Object.assign(filter, { checkIn: { $lte: today }, checkOut: { $gt: today } });
      else if (when === 'past') Object.assign(filter, { checkOut: { $lte: today } });
      else throw new BadRequestException('when must be upcoming, current, past or all');
    }

    if (status !== undefined && status !== '') {
      if (status === 'cancelled') filter.status = 'cancelled';
      else if (status === 'confirmed') filter.status = NOT_CANCELLED;
      else throw new BadRequestException('status must be confirmed or cancelled');
    } else if (when !== undefined && when !== '' && when !== 'all') {
      filter.status = NOT_CANCELLED; // "upcoming / in house / past" are about stays that are still on
    }

    const rows = await this.bookingModel.find(filter).sort({ _id: 1 }).lean();
    return rows.map((row) => toBooking(row, true));
  }

  /** Find one booking by its confirmation code (guest confirmation page). */
  async findByCode(code: string): Promise<Booking> {
    assertText(code, 'code', { required: true, max: 20 });
    const row = await this.bookingModel.findOne({ code: code.toUpperCase() }).lean();
    if (!row) throw new NotFoundException('Booking not found');
    return toBooking(row);
  }

  /**
   * "My booking" lookup: the confirmation code AND the e-mail used at booking must both match.
   * One shared error message, so nobody can use this to find out which codes exist.
   */
  async lookup(code?: string, email?: string): Promise<Booking> {
    if (typeof code !== 'string' || typeof email !== 'string') {
      // Same answer as "no match": a malformed request must not reveal anything.
      throw new NotFoundException('We could not find a booking with that code and e-mail');
    }
    const row = await this.bookingModel.findOne({ code: (code ?? '').trim().toUpperCase() }).lean();
    const emailMatches = !!row?.guestEmail && row.guestEmail.toLowerCase() === (email ?? '').trim().toLowerCase();
    if (!row || !emailMatches) {
      throw new NotFoundException('We could not find a booking with that code and e-mail');
    }
    return toBooking(row);
  }

  /**
   * Every room, each flagged with isAvailable for the given stay.
   * Dates are optional: with none, we answer "is it free tonight?" (used by the staff dashboard).
   */
  async findAvailability(checkIn?: string, checkOut?: string): Promise<RoomAvailability[]> {
    assertText(checkIn, 'checkIn', { max: 10 });
    assertText(checkOut, 'checkOut', { max: 10 });
    const start = checkIn ?? isoDay(0);
    const end = checkOut ?? isoDay(1);
    this.calculateNights(start, end); // validates the range

    // One query: which rooms have a booking that overlaps this stay?
    const [rooms, busyRooms] = await Promise.all([
      this.roomsService.findAll(),
      this.bookingModel.distinct('roomNumber', { checkIn: { $lt: end }, checkOut: { $gt: start }, status: NOT_CANCELLED }),
    ]);
    const busy = new Set<string>(busyRooms);
    return rooms.map((room) => ({ ...room, isAvailable: !busy.has(room.roomNumber) }));
  }

  /**
   * Staff cancel a booking with a reason. The booking is KEPT (status "cancelled", with who/when/why) and its
   * nights are released, so the room can be booked again straight away. Online payments are not refunded by
   * this app. Only one cancel can win if two staff click at once (conditional update).
   */
  async cancel(code: unknown, reason: unknown, staffUsername: string): Promise<Booking> {
    assertText(code, 'code', { required: true, max: 20 });
    assertText(reason, 'reason', { required: true, max: 300 });
    const text = (reason as string).trim();
    if (text.length < 3) throw new BadRequestException('Please give a reason (at least 3 characters)');

    const existing = await this.bookingModel.findOne({ code: (code as string).toUpperCase() }).lean();
    if (!existing) throw new NotFoundException('Booking not found');
    if (existing.status === 'cancelled') throw new ConflictException('This booking is already cancelled');
    if (existing.checkOut <= isoDay(0)) throw new BadRequestException('A stay that has already finished cannot be cancelled');

    const updated = await this.bookingModel
      .findOneAndUpdate(
        { code: existing.code, status: NOT_CANCELLED },
        { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: text, cancelledBy: staffUsername } },
        { new: true },
      )
      .lean();
    if (!updated) throw new ConflictException('This booking is already cancelled');

    // Release the room: delete this booking's nights (the unique index is what blocks new bookings).
    const dates = Array.from({ length: this.calculateNights(updated.checkIn, updated.checkOut) }, (_, index) =>
      new Date(new Date(updated.checkIn).getTime() + index * MS_PER_DAY).toISOString().slice(0, 10),
    );
    await this.nightModel.deleteMany({ roomNumber: updated.roomNumber, date: { $in: dates } });
    return toBooking(updated, true);
  }

  /** Price breakdown for a stay in one room. Used by the checkout page so the numbers come from the server. */
  async quote(roomNumber: string, checkIn: string, checkOut: string): Promise<Pricing> {
    assertText(roomNumber, 'roomNumber', { required: true, max: 10 });
    assertText(checkIn, 'checkIn', { required: true, max: 10 });
    assertText(checkOut, 'checkOut', { required: true, max: 10 });
    const room = await this.roomsService.findByRoomNumber(roomNumber ?? '');
    if (!room) throw new NotFoundException(`Room ${roomNumber} does not exist`);
    return calculatePricing(this.calculateNights(checkIn, checkOut), room.pricePerNight);
  }

  /** Validate the input, hold the nights, take payment if provided, then store the booking. */
  async create(input: CreateBookingInput): Promise<Booking> {
    const { guestName, guestEmail, guestPhone, specialRequests, roomNumber, checkIn, checkOut, payment } =
      input ?? ({} as CreateBookingInput);
    const guests = Number(input?.guests ?? 1);

    // Every text field must really be text (and not absurdly long) before we use it.
    if (typeof input !== 'object' || input === null) throw new BadRequestException('A JSON body is required');
    assertText(guestName, 'guestName', { max: 100 });
    assertText(guestEmail, 'guestEmail', { max: 254 });
    assertText(guestPhone, 'guestPhone', { max: 20 });
    assertText(specialRequests, 'specialRequests', { max: 500 });
    assertText(roomNumber, 'roomNumber', { max: 10 });
    assertText(checkIn, 'checkIn', { max: 10 });
    assertText(checkOut, 'checkOut', { max: 10 });
    if (payment !== undefined && (typeof payment !== 'object' || payment === null || Array.isArray(payment))) {
      throw new BadRequestException('payment must be an object');
    }

    if (!guestName?.trim() || !roomNumber || !checkIn || !checkOut) {
      throw new BadRequestException('guestName, roomNumber, checkIn and checkOut are required');
    }
    if (!Number.isInteger(guests) || guests < 1) {
      throw new BadRequestException('guests must be a whole number of at least 1');
    }
    if (checkIn < isoDay(0)) {
      throw new BadRequestException('checkIn cannot be in the past');
    }
    if (payment && !guestEmail?.trim()) {
      throw new BadRequestException('guestEmail is required for online bookings');
    }

    const nights = this.calculateNights(checkIn, checkOut);

    const room: Room | null = await this.roomsService.findByRoomNumber(roomNumber);
    if (!room) {
      throw new NotFoundException(`Room ${roomNumber} does not exist`);
    }
    if (guests > room.capacity) {
      throw new BadRequestException(`Room ${roomNumber} sleeps at most ${room.capacity} guest(s)`);
    }
    if ((specialRequests?.length ?? 0) > 500) {
      throw new BadRequestException('specialRequests must be 500 characters or fewer');
    }
    // Friendly early answer. The unique index below is what really guarantees there is no double booking.
    if (!(await this.isRoomFree(roomNumber, checkIn, checkOut))) {
      throw new BadRequestException(`Room ${roomNumber} is not available for those dates`);
    }

    const pricing = calculatePricing(nights, room.pricePerNight);

    // 1) hold the nights, 2) charge, 3) save. If anything after step 1 fails, the nights are released.
    const bookingKey = randomBytes(8).toString('hex');
    await this.reserveNights(roomNumber, checkIn, checkOut, bookingKey);
    try {
      const receipt = payment ? this.paymentsService.charge(pricing.totalAmount, payment) : undefined;
      const saved = await this.insertWithUniqueCode({
        guestName: guestName.trim(),
        guestEmail: guestEmail?.trim() || undefined,
        guestPhone: guestPhone?.trim() || undefined,
        specialRequests: specialRequests?.trim() || undefined,
        guests,
        roomNumber,
        checkIn,
        checkOut,
        subtotal: pricing.subtotal,
        serviceCharge: pricing.serviceCharge,
        vat: pricing.vat,
        totalAmount: pricing.totalAmount,
        source: payment ? 'online' : 'front-desk',
        paymentMethod: receipt?.method,
        paymentReference: receipt?.reference,
        paymentLast4: receipt?.last4,
      });
      return toBooking(saved);
    } catch (error) {
      await this.nightModel.deleteMany({ bookingKey });
      throw error;
    }
  }

  /**
   * A room is free when no existing booking overlaps the requested stay.
   * Two stays [a.in, a.out) and [b.in, b.out) overlap when a.in < b.out AND b.in < a.out.
   * Check-out day is exclusive, so someone can arrive the same day another guest leaves.
   * ISO dates ("YYYY-MM-DD") compare correctly as plain strings, so MongoDB can use $lt / $gt on them.
   */
  private async isRoomFree(roomNumber: string, checkIn: string, checkOut: string): Promise<boolean> {
    const clash = await this.bookingModel.exists({
      roomNumber,
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
      status: NOT_CANCELLED,
    });
    return !clash;
  }

  /** Insert one "room night" document per night. A duplicate means someone else just took that night. */
  private async reserveNights(roomNumber: string, checkIn: string, checkOut: string, bookingKey: string): Promise<void> {
    const count = this.calculateNights(checkIn, checkOut);
    const docs = Array.from({ length: count }, (_, index) => ({
      roomNumber,
      date: new Date(new Date(checkIn).getTime() + index * MS_PER_DAY).toISOString().slice(0, 10),
      bookingKey,
    }));
    try {
      await this.nightModel.insertMany(docs, { ordered: true });
    } catch (error) {
      await this.nightModel.deleteMany({ bookingKey }); // undo the nights that did get inserted
      if (isDuplicateKey(error)) {
        throw new BadRequestException(`Room ${roomNumber} is not available for those dates`);
      }
      throw error;
    }
  }

  /** Save a booking with a fresh confirmation code; in the (very unlikely) event of a code clash, try another. */
  private async insertWithUniqueCode(data: Omit<BookingEntity, 'code'>): Promise<BookingEntity & { _id: unknown }> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await this.bookingModel.create({ ...data, code: this.generateCode() });
        return created.toObject();
      } catch (error) {
        if (!(isDuplicateKey(error) && error.keyPattern?.code)) throw error;
      }
    }
    throw new Error('Could not generate a unique booking code');
  }

  /** Adds one sample booking (used only for the first-start seed). Offsets are days from today. */
  private async seed(
    code: string,
    guestName: string,
    roomNumber: string,
    guests: number,
    startOffset: number,
    endOffset: number,
    source: Booking['source'],
    guestEmail?: string,
  ): Promise<void> {
    const room = await this.roomsService.findByRoomNumber(roomNumber);
    if (!room) return;
    const checkIn = isoDay(startOffset);
    const checkOut = isoDay(endOffset);
    const pricing = calculatePricing(endOffset - startOffset, room.pricePerNight);
    const bookingKey = `seed-${code}`;
    await this.reserveNights(roomNumber, checkIn, checkOut, bookingKey);
    await this.bookingModel.create({
      code,
      guestName,
      guestEmail,
      guests,
      roomNumber,
      checkIn,
      checkOut,
      subtotal: pricing.subtotal,
      serviceCharge: pricing.serviceCharge,
      vat: pricing.vat,
      totalAmount: pricing.totalAmount,
      source,
      ...(source === 'online'
        ? { paymentMethod: 'card' as const, paymentReference: 'PAY-7K2M4Q8T', paymentLast4: '4242' }
        : {}),
    });
  }

  /**
   * Short random confirmation code such as "IV-7K2M9Q".
   * The alphabet skips look-alike characters (0/O, 1/I) so a guest can read it out over the phone.
   */
  private generateCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `IV-${suffix}`;
  }

  /** Number of nights between two ISO dates; throws if the range is invalid. */
  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      throw new BadRequestException('checkIn and checkOut must be valid dates');
    }

    const nights = Math.round((end - start) / MS_PER_DAY);
    if (nights < 1) {
      throw new BadRequestException('checkOut must be at least one day after checkIn');
    }
    return nights;
  }
}
