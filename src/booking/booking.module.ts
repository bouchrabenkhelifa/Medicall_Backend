import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  providers: [BookingService, BookingController]
})
export class BookingModule {}
