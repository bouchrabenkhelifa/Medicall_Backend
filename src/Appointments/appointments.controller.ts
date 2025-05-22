/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get,Patch, Query, Param, ParseIntPipe,HttpException,HttpStatus, Post, Body } from '@nestjs/common'; 
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book_appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService :AppointmentsService) {}

@Get('test-reminder')
async testReminder() {
  return this.appointmentsService.sendReminderForTomorrow();
}

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
  //Booking Endpoint
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@Post('book/')
  async bookAppointment(@Body() bookingDto: BookAppointmentDto) {
    return this.appointmentsService.bookAppointment(bookingDto);
  }

}

