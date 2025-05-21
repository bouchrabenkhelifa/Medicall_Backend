/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { AppointmentsModule } from './appointments/appointments.module';


@Module({
  
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, AuthModule, UsersModule, PrescriptionsModule, AppointmentsModule, 
  ],
})
export class AppModule {}
