import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { SubscriberEntity, SubscriberSchema } from './subscriber.schema';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: SubscriberEntity.name, schema: SubscriberSchema }])],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
