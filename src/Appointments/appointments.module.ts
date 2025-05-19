/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DoctorsModule } from 'src/doctors/doctors.module';
import { AppointmentsController } from './appointments.controller';


@Module({
   imports: [
    DoctorsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports:[AppointmentsService]
})
export class AppointmentsModule {}
