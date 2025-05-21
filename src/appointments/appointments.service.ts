/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { BitOperationsUtil } from './utils/bit-operations.util';
import { BookAppointmentDto } from './dto/book_appointment.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class AppointmentsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_KEY')!
    );
  }


  async GetAll() {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `);
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }
  
    // Aplatir ici
    const flattenedData = data.map(appointment => ({
      id: appointment.id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      date_time: appointment.date_time,
      status: appointment.status,
      qr_code: appointment.qr_code,
      first_name: appointment.patient?.user?.first_name || null,
      family_name: appointment.patient?.user?.family_name || null,
      phone: appointment.patient?.user?.phone || null,
    }));
  
    return flattenedData;
  }


  async getAppointmentsByDoctor(doctorId: number) {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `)
      .eq('doctor_id', doctorId);
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }
  
    const flattenedData = data.map(appointment => ({
      id: appointment.id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      date_time: appointment.date_time,
      status: appointment.status,
      qr_code: appointment.qr_code,
      created_at: appointment.created_at,
      user_id: appointment.patient?.user_id || null,
      birthdate: appointment.patient?.birthdate || null,
      first_name: appointment.patient?.user?.first_name || null,
      family_name: appointment.patient?.user?.family_name || null,
      phone: appointment.patient?.user?.phone || null,
    }));
  
    return flattenedData;
  }
  async getAppointmentById(id: number) {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `)
      .eq('id', id)
      .single(); 
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération du rendez-vous');
    }
  
    const appointment = {
      id: data.id,
      doctor_id: data.doctor_id,
      patient_id: data.patient_id,
      date_time: data.date_time,
      status: data.status,
      qr_code: data.qr_code,
      created_at: data.created_at,
      user_id: data.patient?.user_id || null,
      birthdate: data.patient?.birthdate || null,
      first_name: data.patient?.user?.first_name || null,
      family_name: data.patient?.user?.family_name || null,
      phone: data.patient?.user?.phone || null,
    };
  
    return appointment;
  }


  //Booking Appointments
  //Function to book appointments
async bookAppointment(
  bookingDto: BookAppointmentDto,
): Promise<{ status: string; message: string }> {
  try {
    const { doctorId, patientId, date, slotPosition } = bookingDto;

    // Format the date part (YYYY-MM-DD)
    const formattedDate = new Date(date);
    const year = formattedDate.getFullYear();
    const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
    const day = String(formattedDate.getDate()).padStart(2, '0');
    const dateOnly = `${year}-${month}-${day}`;

    // Check if appointment already exists for same doctor, patient, slot, and date
    // Using Postgres date_trunc to filter only by date part of date_time
    const { data: existingAppointments, error: checkError } = await this.supabase
      .from('appointment')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('slot', slotPosition)
      .gte('date_time', `${dateOnly}T00:00:00Z`) // Start of the day (UTC)
      .lt('date_time', `${dateOnly}T23:59:59Z`); // End of the day (UTC)

    if (checkError) {
      console.error('Error checking existing appointments:', checkError);
      throw new BadRequestException('Failed to check existing appointments.');
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        status: 'error',
        message: 'You already have an appointment booked for this date and time.',
      };
    }

    // Convert slotPosition to time string (e.g., "08:00 AM")
    const slotTime = BitOperationsUtil.slotToTimeString(slotPosition);
    const [timeStr, period] = slotTime.split(' ');
    const [hourStr, minuteStr] = timeStr.split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);

    // Convert 12h time to 24h time
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // Compose final date_time string in ISO format
    const formattedDateTime = `${dateOnly}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;

    // Insert new appointment
    const { error: insertError } = await this.supabase
      .from('appointment')
      .insert([
        {
          doctor_id: doctorId,
          patient_id: patientId,
          date_time: formattedDateTime,
          slot: slotPosition,
          status: 'Confirmed',
          qr_code: await this.generateQrCode(
            `Doctor: ${doctorId}, Patient: ${patientId}, Date: ${formattedDateTime}`
          ),
          created_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error('Error booking appointment:', insertError);
      throw new BadRequestException('Failed to book appointment.');
    }

    return {
      status: 'success',
      message: 'Appointment booked successfully.',
    };
  } catch (err) {
    console.error('Booking error:', err);
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
      const { data: appointment, error } = await this.supabase
        .from('appointment') // Replace with your actual table name
        .select('*')
        .eq('id', id)
        .single();

      if (error || !appointment) {
        throw new NotFoundException(`Appointment with ID ${id} not found.`);
      }

      // Delete the appointment
      const { error: deleteError } = await this.supabase
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

  private async generateQrCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data);
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return '';
  }
}

   
}  