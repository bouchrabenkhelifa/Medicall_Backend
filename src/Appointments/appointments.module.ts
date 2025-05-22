/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

import { DoctorsModule } from 'src/doctors/doctors.module';

import { FirebaseModule } from '../firebase/firebase.module'; 
import { ConfigModule } from '@nestjs/config';

import { AppointmentsController } from './appointments.controller';


@Module({
  imports: [FirebaseModule, ConfigModule, DoctorsModule], 
  providers: [AppointmentsService],
  controllers: [AppointmentsController], 
})
export class AppointmentsModule {}
