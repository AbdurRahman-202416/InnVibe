import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './room.interface';
import { RoomDocument, RoomEntity } from './room.schema';
import { ROOMS_SEED } from './rooms.seed';

/** RoomsService reads the room catalogue from MongoDB (collection "rooms") */
@Injectable()
export class RoomsService implements OnModuleInit {
  constructor(@InjectModel(RoomEntity.name) private readonly roomModel: Model<RoomDocument>) {}

  /** On start, add any catalogue room that is missing (existing rooms are never overwritten) */
  async onModuleInit(): Promise<void> {
    const existing = new Set((await this.roomModel.find().select('roomNumber').lean()).map((room) => room.roomNumber));
    const missing = ROOMS_SEED.filter((room) => !existing.has(room.roomNumber));
    if (missing.length > 0) await this.roomModel.insertMany(missing);
  }

  /** Return every room, ordered by room number (101, 102, ... 403). */
  async findAll(): Promise<Room[]> {
    return this.roomModel.find().sort({ roomNumber: 1 }).select('-_id').lean<Room[]>();
  }

  /** Find one room by its human-facing number (e.g. "201"). */
  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    return this.roomModel.findOne({ roomNumber }).select('-_id').lean<Room>();
  }
}
