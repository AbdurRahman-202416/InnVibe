import { Controller, Get } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Room } from './room.interface';

/** Handles HTTP requests that start with /rooms. */
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** GET /rooms -> list of all rooms */
  @Get()
  getAllRooms(): Promise<Room[]> {
    return this.roomsService.findAll();
  }
}
