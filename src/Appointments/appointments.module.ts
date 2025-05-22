/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
<<<<<<< HEAD:src/Appointments/appointments.module.ts
import { DoctorsModule } from 'src/doctors/doctors.module';
=======
import { FirebaseModule } from '../firebase/firebase.module'; 
import { ConfigModule } from '@nestjs/config';
>>>>>>> origin/bouchra:src/appointments/appointments.module.ts
import { AppointmentsController } from './appointments.controller';


@Module({
<<<<<<< HEAD:src/Appointments/appointments.module.ts
   imports: [
    DoctorsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports:[AppointmentsService]
=======
  imports: [FirebaseModule, ConfigModule], 
  providers: [AppointmentsService],
  controllers: [AppointmentsController], 
>>>>>>> origin/bouchra:src/appointments/appointments.module.ts
})
export class AppointmentsModule {}
