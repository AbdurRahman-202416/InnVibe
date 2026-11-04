import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { RoomAvailability } from '../rooms/room.interface';
import { Booking, CreateBookingInput } from './booking.interface';
import { BookingsService } from './bookings.service';
import { Pricing } from './pricing';

/** Handles HTTP requests that start with /bookings. */
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /bookings?q=&source=&when=&status= -> bookings with guest details, optionally filtered. STAFF ONLY (needs a token).
   * q searches code, name, e-mail, phone and room; source = online | front-desk;
   * when = upcoming | current | past; status = confirmed | cancelled.
   */
  @UseGuards(AuthGuard)
  @Get()
  getAllBookings(
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('when') when?: string,
    @Query('status') status?: string,
  ): Promise<Booking[]> {
    return this.bookingsService.findAll({ q, source, when, status });
  }

  /** POST /bookings/IV-7K2M9Q/cancel { reason } -> cancel a booking and free the room. STAFF ONLY. */
  @UseGuards(AuthGuard)
  @Post(':code/cancel')
  cancelBooking(@Param('code') code: string, @Body() body: { reason?: unknown }, @Req() request: AuthedRequest): Promise<Booking> {
    return this.bookingsService.cancel(code, body?.reason, request.user?.username ?? 'staff');
  }

  /**
   * GET /bookings/availability?checkIn=2026-11-10&checkOut=2026-11-13
   * -> every room with isAvailable for that stay (no dates = tonight). Public.
   * Fixed-path routes are declared BEFORE the :code route so they are not mistaken for a code.
   */
  @Get('availability')
  getAvailability(
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
  ): Promise<RoomAvailability[]> {
    return this.bookingsService.findAvailability(checkIn, checkOut);
  }

  /** GET /bookings/quote?roomNumber=201&checkIn=..&checkOut=.. -> price breakdown (rate, service charge, VAT, total). Public. */
  @Get('quote')
  getQuote(
    @Query('roomNumber') roomNumber: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ): Promise<Pricing> {
    return this.bookingsService.quote(roomNumber, checkIn, checkOut);
  }

  /** GET /bookings/IV-7K2M9Q -> one booking by confirmation code (guest confirmation page). Public. */
  @Get(':code')
  getBooking(@Param('code') code: string): Promise<Booking> {
    return this.bookingsService.findByCode(code);
  }

  /** POST /bookings/lookup { code, email } -> find "my booking" (both must match). Public. */
  @Post('lookup')
  lookup(@Body() body: { code?: string; email?: string }): Promise<Booking> {
    return this.bookingsService.lookup(body?.code, body?.email);
  }

  /**
   * POST /bookings -> create a booking.
   *  - Guests send a `payment` object (public route, they pay online).
   *  - Without `payment` it is a front-desk booking, which only signed-in staff may create.
   */
  @Post()
  async createBooking(@Body() body: CreateBookingInput, @Headers('authorization') authorization?: string): Promise<Booking> {
    if (!body?.payment) await this.authService.requireStaff(authorization);
    return this.bookingsService.create(body);
  }
}
