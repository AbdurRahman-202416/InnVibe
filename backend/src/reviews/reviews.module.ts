import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ReviewEntity, ReviewSchema } from './review.schema';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule, BookingsModule, MongooseModule.forFeature([{ name: ReviewEntity.name, schema: ReviewSchema }])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
