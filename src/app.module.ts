/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './Appointments/appointments.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, AuthModule, UsersModule, AppointmentsModule
  ],
})
export class AppModule {}
