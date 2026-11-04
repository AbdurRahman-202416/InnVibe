import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { BookingEntity, BookingSchema, RoomNightEntity, RoomNightSchema } from './booking.schema';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PaymentsService } from './payments.service';

/** Imports RoomsModule (room lookup) and AuthModule (staff-only routes). PaymentsService is the dummy gateway. */
@Module({
  imports: [
    RoomsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: BookingEntity.name, schema: BookingSchema },
      { name: RoomNightEntity.name, schema: RoomNightSchema },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, PaymentsService],
  exports: [BookingsService], // ReviewsModule uses it to verify a guest's booking code + e-mail
})
export class BookingsModule {}
