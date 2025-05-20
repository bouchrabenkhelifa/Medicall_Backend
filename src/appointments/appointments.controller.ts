import { Controller, Get,Patch, Query, Param, ParseIntPipe,HttpException,HttpStatus } from '@nestjs/common'; 
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

  @Get(':id')
async findById(@Param('id') id: number) {
  return this.appointmentsService.getAppointmentById(id);
}
 @Patch('cancel/:id')
  async cancelAppointment(@Param('id') id: string) {
    return this.appointmentsService.cancelAppointment(+id);
  }

}

