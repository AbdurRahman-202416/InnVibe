import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomsController } from './rooms.controller';
import { RoomEntity, RoomSchema } from './room.schema';
import { RoomsService } from './rooms.service';

/** RoomsService is exported so BookingsModule can reuse it. */
@Module({
  imports: [MongooseModule.forFeature([{ name: RoomEntity.name, schema: RoomSchema }])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
