import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { FirebaseModule } from '../firebase/firebase.module'; 
import { ConfigModule } from '@nestjs/config';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [FirebaseModule, ConfigModule], 
  providers: [AppointmentsService],
  controllers: [AppointmentsController], 
})
export class AppointmentsModule {}
