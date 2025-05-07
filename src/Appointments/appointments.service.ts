/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
 
/* eslint-disable prettier/prettier */
 
 
/* eslint-disable prettier/prettier */
 
 
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentResponseDto } from './entities/appointment.entity';
import { BookAppointmentDto } from './dto/book_appointment.dto';
import { DoctorsService } from '../doctors/doctors.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    private doctorsService: DoctorsService,
  ) {}

//Function to book an appointment
  async bookAppointment(bookingDto: BookAppointmentDto): Promise<AppointmentResponseDto> {
    try {
    const { doctorId, patientId, date, slotPosition } = bookingDto;
    
    // Format date to exclude time
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    

    // Mark sloth as unavailable
    await this.doctorsService.markSlotAsUnavailable(doctorId, formattedDate, slotPosition);
    
    // Create the appointment
    const newAppointment = this.appointmentsRepository.create({
      doctorId,
      patientId,
      date: date,
      slot: slotPosition,
      status: 'Confirmed', 
      qr_code: '',       
      created_at: formattedDate,
    });
    this.appointmentsRepository.save(newAppointment);
    return {
      status: 'success',
      message: 'Appointment booked successfully',
    };
  } catch (error) {
    console.error('Booking error:', error);

    // Example of basic network/DB error checking
    if (error.code === 'ECONNREFUSED' || error.name === 'QueryFailedError') {
      return {
        status: 'error',
        message: 'Network or database error occurred. Please try again later.',
      };
    }

    return {
      status: 'error',
      message: 'Apologies ! an unexpected error occurred, Please Try again later',
    };
  }
  }

  //Function to Cancel an existing appointment
  async cancelAppointment(id: number): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsRepository.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    await this.appointmentsRepository.delete(id);

    return {
      status: 'success',
      message: `Appointment  successfully cancelled.`,
    };
  }
}