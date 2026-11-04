import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** A newsletter sign-up in MongoDB (collection "subscribers"). The unique index means one e-mail can only be there once. */
@Schema({ collection: 'subscribers', versionKey: false })
export class SubscriberEntity {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: Date, default: () => new Date() })
  subscribedAt: Date;
}

export type SubscriberDocument = HydratedDocument<SubscriberEntity>;
export const SubscriberSchema = SchemaFactory.createForClass(SubscriberEntity);
