/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Param, Post, Body, Delete, ParseIntPipe } from '@nestjs/common'; 
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book_appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('all')
  async findAllDoctors() {
    return this.appointmentsService.GetAll();
  }

  @Get('by-doctor')
  async findByDoctor(@Query('doctorId', ParseIntPipe) doctorId: number) {
    return this.appointmentsService.getAppointmentsByDoctor(doctorId);
  }

  @Get('patient/:patientId/confirmed')
  async getConfirmedAppointments(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.appointmentsService.getConfirmedAppointmentsByPatient(patientId);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Post('book')
  async bookAppointment(@Body() bookingDto: BookAppointmentDto) {
    return this.appointmentsService.bookAppointment(bookingDto);
  }

  @Delete('cancelBooking/:id')
  async cancelAppointment(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.cancelAppointment(id);
  }
}

