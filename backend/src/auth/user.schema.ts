import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** A staff account in MongoDB (collection "staffusers"). The password itself is never stored, only its scrypt hash. */
@Schema({ collection: 'staffusers', versionKey: false })
export class StaffUserEntity {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  username: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, enum: ['admin', 'receptionist'] })
  role: 'admin' | 'receptionist';

  @Prop({ type: String, required: true })
  salt: string; // random per user, hex

  @Prop({ type: String, required: true })
  hash: string; // scrypt(password, salt), hex
}

export type StaffUserDocument = HydratedDocument<StaffUserEntity>;
export const StaffUserSchema = SchemaFactory.createForClass(StaffUserEntity);
