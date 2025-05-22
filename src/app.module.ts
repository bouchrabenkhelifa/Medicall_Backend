/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';

import { UsersModule } from './users/users.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentsModule } from './Appointments/appointments.module';


@Module({
  
  imports: [
        ScheduleModule.forRoot(), 
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, AuthModule, UsersModule, PrescriptionsModule, AppointmentsModule, FirebaseModule, 
  ],
})
export class AppModule {}
