/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Param, Delete } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book_appointment.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('book/')
  async bookAppointment(@Body() bookingDto: BookAppointmentDto) {
    return this.appointmentsService.bookAppointment(bookingDto);
  }

  @Delete('cancelBooking/:id')
  async cancelAppointment(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.cancelAppointment(id);
  }
}
