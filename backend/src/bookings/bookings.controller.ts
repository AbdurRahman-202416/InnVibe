import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { RoomAvailability } from '../rooms/room.interface';
import { Booking, CreateBookingInput } from './booking.interface';
import { BookingsService } from './bookings.service';
import { Pricing } from './pricing';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly authService: AuthService,
  ) {}

  /** GET /bookings (staff only, filters optional) */
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

  /** POST /bookings/:code/cancel (staff only) */
  @UseGuards(AuthGuard)
  @Post(':code/cancel')
  cancelBooking(@Param('code') code: string, @Body() body: { reason?: unknown }, @Req() request: AuthedRequest): Promise<Booking> {
    return this.bookingsService.cancel(code, body?.reason, request.user?.username ?? 'staff');
  }

  /** GET /bookings/availability?checkIn=2026-11-10&checkOut=2026-11-13 */
  @Get('availability')
  getAvailability(
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
  ): Promise<RoomAvailability[]> {
    return this.bookingsService.findAvailability(checkIn, checkOut);
  }

  /** GET /bookings/quote (price breakdown) */
  @Get('quote')
  getQuote(
    @Query('roomNumber') roomNumber: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ): Promise<Pricing> {
    return this.bookingsService.quote(roomNumber, checkIn, checkOut);
  }

  /** GET /bookings/:code */
  @Get(':code')
  getBooking(@Param('code') code: string): Promise<Booking> {
    return this.bookingsService.findByCode(code);
  }

  /** POST /bookings/lookup (code, e-mail or mobile) */
  @Post('lookup')
  lookup(@Body() body: { query?: unknown }): Promise<Booking[]> {
    return this.bookingsService.search(body?.query);
  }

  /** POST /bookings -> create a booking */
  @Post()
  async createBooking(@Body() body: CreateBookingInput, @Headers('authorization') authorization?: string): Promise<Booking> {
    if (!body?.payment) await this.authService.requireStaff(authorization);
    return this.bookingsService.create(body);
  }
}
