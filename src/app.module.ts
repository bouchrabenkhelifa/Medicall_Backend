import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';
import { BookingController } from './booking/booking.controller';
import { BookingModule } from './booking/booking.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, AuthModule, BookingModule, 
  ],
  controllers: [BookingController],
})
export class AppModule {}
