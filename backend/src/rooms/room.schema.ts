import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** MongoDB document for a room. Explicit `type`s are needed where TypeScript's type is a union or an array. */
@Schema({ collection: 'rooms', versionKey: false })
export class RoomEntity {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String, required: true, unique: true })
  roomNumber: string;

  @Prop({ type: String, required: true, enum: ['Single', 'Double', 'Deluxe', 'Suite'] })
  type: 'Single' | 'Double' | 'Deluxe' | 'Suite';

  @Prop({ type: Number, required: true })
  pricePerNight: number;

  @Prop({ type: Number, required: true })
  capacity: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: [String], default: [] })
  gallery: string[];

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: String, required: true })
  bed: string;

  @Prop({ type: String, required: true })
  view: string;

  @Prop({ type: [String], default: [] })
  amenities: string[];
}

export type RoomDocument = HydratedDocument<RoomEntity>;
export const RoomSchema = SchemaFactory.createForClass(RoomEntity);
