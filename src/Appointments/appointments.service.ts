/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { BookAppointmentDto } from './dto/book_appointment.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { ConfigService } from '@nestjs/config';
import { BitOperationsUtil } from './utils/bit-operations.util';

@Injectable()
export class AppointmentsService {
  private readonly supabaseClient: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly doctorsService: DoctorsService,
  ) {
    // Initialize the Supabase client with environment variables
    this.supabaseClient = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_KEY')!,
    );
  }

//Function to book appointments
 async bookAppointment(
  bookingDto: BookAppointmentDto,
): Promise<{ status: string; message: string }> {
  try {
    const { doctorId, patientId, date, slotPosition } = bookingDto;

    // Format the date to exclude time
    const formattedDate = new Date(date);
      const year = formattedDate.getFullYear();
      const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
      const day = String(formattedDate.getDate()).padStart(2, '0');
      const dt = `${year}-${month}-${day}`;
    // First, check for existing appointments for this patient on the same date
    const { data: existingAppointments, error: checkError } = await this.supabaseClient
      .from('appointment')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('slot', slotPosition)
     .filter('date_time::date', 'eq', dt); // +1 day

    if (checkError) {
      console.error('Error checking existing appointments:', checkError);
      throw new BadRequestException('Failed to check existing appointments.');
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        status: 'error',
        message: 'You already have an appointment booked for this date.',
      };
    }

    // Convert slot position to hours and minutes using the utility function
    const slotTime = BitOperationsUtil.slotToTimeString(slotPosition);
    
    // Parse the time from the slot (format: "08:00 AM")
    const [timeStr, period] = slotTime.split(' ');
    const [hoursStr, minutesStr] = timeStr.split(':');
    
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    // Convert to 24-hour format if needed
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0; // 12 AM is 00:00 in 24-hour time
    }
    
    // Create a new date object with both date and time components
   const formattedDateTime = `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    console.log(formattedDateTime)
    // Insert the new appointment into the database
    const { data, error } = await this.supabaseClient
      .from('appointment') 
      .insert([
        {
          doctor_id: doctorId,
          patient_id: patientId,
          date_time: formattedDateTime,
          slot: slotPosition,
          status: 'Confirmed',
          qr_code: "test", 
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error booking appointment:', error);
      throw new BadRequestException('Failed to book appointment.');
    }
    
    return {
      status: 'success',
      message: 'Appointment booked successfully.',
    };
  } catch (error) {
    console.error('Booking error:', error);

    
    return {
      status: 'error',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}

  // Function to cancel an existing appointment
  async cancelAppointment(id: number): Promise<{ status: string; message: string }> {
    try {
      // Find the appointment by ID
      const { data: appointment, error } = await this.supabaseClient
        .from('appointment') // Replace with your actual table name
        .select('*')
        .eq('id', id)
        .single();

      if (error || !appointment) {
        throw new NotFoundException(`Appointment with ID ${id} not found.`);
      }

      // Delete the appointment
      const { error: deleteError } = await this.supabaseClient
        .from('appointment')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error canceling appointment:', deleteError);
        throw new BadRequestException('Failed to cancel appointment.');
      }

      return {
        status: 'success',
        message: 'Appointment successfully cancelled.',
      };
    } catch (error) {
      console.error('Cancel error:', error);

      // Return a generic error message for any unexpected issues
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again later.',
      };
    }
  }
}