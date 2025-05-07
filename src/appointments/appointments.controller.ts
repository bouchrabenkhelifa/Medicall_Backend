import { Controller, Get, Query, Param } from '@nestjs/common'; 
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService :AppointmentsService) {}

  @Get('all')
  async findAllDoctors() {
    return this.appointmentsService.GetAll();
  }
  @Get('by-doctor')
  async findByDoctor(@Query('doctorId') doctorId: number) {
    return this.appointmentsService.getAppointmentsByDoctor(doctorId);
  }
}
