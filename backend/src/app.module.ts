import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { mongoDbName, mongoUri } from './common/config';
import { BookingsModule } from './bookings/bookings.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RoomsModule } from './rooms/rooms.module';

/** Root module: connects to MongoDB (Atlas) and wires the feature modules together. */
@Module({
  controllers: [AppController],
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = mongoUri();
        return {
          uri,
          dbName: mongoDbName(uri),
          serverSelectionTimeoutMS: 10000, // fail fast (with a clear error) instead of hanging when Atlas cannot be reached
          retryAttempts: 2,
          retryDelay: 2000,
        };
      },
    }),
    AuthModule,
    RoomsModule,
    BookingsModule,
    NewsletterModule,
    ReviewsModule,
  ],
})
export class AppModule {}
