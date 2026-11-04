import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './room.interface';
import { RoomDocument, RoomEntity } from './room.schema';
import { ROOMS_SEED } from './rooms.seed';

/**
 * RoomsService reads the room catalogue from MongoDB (collection "rooms").
 * It only knows what a room IS. Whether a room is free on certain dates is decided by BookingsService,
 * because that depends on the bookings.
 */
@Injectable()
export class RoomsService implements OnModuleInit {
  private readonly logger = new Logger(RoomsService.name);

  constructor(@InjectModel(RoomEntity.name) private readonly roomModel: Model<RoomDocument>) {}

  /** First start against an empty database: write the starting catalogue once. */
  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  /**
   * Safe to call any time (also from other services). Adds the catalogue rooms that are MISSING (matched by room number),
   * so an older database gets newly added rooms, and a room that was edited in the database is never overwritten.
   */
  async ensureSeeded(): Promise<void> {
    const existing = new Set((await this.roomModel.find().select('roomNumber').lean()).map((room) => room.roomNumber));
    const missing = ROOMS_SEED.filter((room) => !existing.has(room.roomNumber));
    if (missing.length > 0) {
      await this.roomModel.insertMany(missing);
      this.logger.log(`Added ${missing.length} room(s) to the catalogue`);
    }
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
