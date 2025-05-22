import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { BookAppointmentDto } from './dto/book_appointment.dto';
import * as QRCode from 'qrcode';
import { BitOperationsUtil } from './utils/bit-operations.util';

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
      throw new Error('Failed to fetch appointments.');
    }

    return data.map((appointment) => ({
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
      throw new Error('Failed to fetch appointments for doctor.');
    }

    return data.map((appointment) => ({
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
      throw new Error('Failed to fetch appointment by ID.');
    }

    return {
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
  }

  async bookAppointment(
    bookingDto: BookAppointmentDto
  ): Promise<{ status: string; message: string; data?: any }> {
    try {
      const { doctorId, patientId, date, slotPosition } = bookingDto;

      const formattedDate = new Date(date);
      const dateOnly = formattedDate.toISOString().split('T')[0];

      const { data: existingAppointments, error: checkError } = await this.supabase
        .from('appointment')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .eq('slot', slotPosition)
        .gte('date_time', `${dateOnly}T00:00:00Z`)
        .lt('date_time', `${dateOnly}T23:59:59Z`);

      if (checkError) {
        console.error('Check error:', checkError);
        throw new BadRequestException('Could not verify existing appointments.');
      }

      if (existingAppointments?.length) {
        return {
          status: 'error',
          message: 'Appointment already exists for this slot and date.',
        };
      }

      const slotTime = BitOperationsUtil.slotToTimeString(slotPosition);
      const [timeStr, period] = slotTime.split(' ');
      const [hourStr, minuteStr] = timeStr.split(':');
      let hours = parseInt(hourStr, 10);
      const minutes = parseInt(minuteStr, 10);

      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const formattedDateTime = `${dateOnly}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
      const qrText = `Doctor: ${doctorId}, Patient: ${patientId}, Date: ${formattedDateTime}`;
      const qrCodeImage = await this.generateQrCode(qrText);

      const { data: insertedData, error: insertError } = await this.supabase
        .from('appointment')
        .insert([
          {
            doctor_id: doctorId,
            patient_id: patientId,
            date_time: formattedDateTime,
            slot: slotPosition,
            status: 'Confirmed',
            qr_code: qrText,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new BadRequestException('Failed to book appointment.');
      }

      return {
        status: 'success',
        message: 'Appointment booked successfully.',
        data: {
          appointment: insertedData?.[0],
          qrCodeImage,
        },
      };
    } catch (err) {
      console.error('Book appointment error:', err);
      return {
        status: 'error',
        message: 'Unexpected error occurred while booking.',
      };
    }
  }

  async cancelAppointment(id: number): Promise<{ status: string; message: string }> {
    try {
      const { data: appointment, error } = await this.supabase
        .from('appointment')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !appointment) {
        throw new NotFoundException(`Appointment with ID ${id} not found.`);
      }

      const { error: deleteError } = await this.supabase
        .from('appointment')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new BadRequestException('Could not cancel appointment.');
      }

      return {
        status: 'success',
        message: 'Appointment cancelled successfully.',
      };
    } catch (err) {
      console.error('Cancel error:', err);
      return {
        status: 'error',
        message: 'Unexpected error occurred while cancelling.',
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





async getConfirmedAppointmentsByPatient(patientId: number) {
  const { data, error } = await this.supabase
    .from('appointment_with_doctor')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'Confirmed')
    .order('date_time', { ascending: true });

  if (error) {
    console.error(error);
    throw new Error('Failed to fetch confirmed appointments with doctor info.');
  }

  return data;
}




 async getConfirmedAppointmentsByDoctor(doctorId: number) {
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
          user (
            first_name,
            family_name,
            phone
          )
        )
      `)
      .eq('doctor_id', doctorId)
      .eq('status', 'Confirmed')
      .order('date_time', { ascending: true });

    if (error) {
      console.error(error);
      throw new Error('Failed to fetch confirmed appointments for doctor.');
    }

    return data.map((apt) => ({
      id: apt.id,
      doctor_id: apt.doctor_id,
      patient_id: apt.patient_id,
      date_time: apt.date_time,
      status: apt.status,
      qr_code: apt.qr_code,
      created_at: apt.created_at,
      first_name: apt.patient?.user?.first_name || null,
      family_name: apt.patient?.user?.family_name || null,
      phone: apt.patient?.user?.phone || null,
    }));
  }

  /** Scan-in (check in) via QR code → mark as Completed */
  async checkInByQRCode(qr_code: string) {
    // fetch the appointment by qr_code
    const { data: appointment, error: fetchError } = await this.supabase
      .from('appointment')
      .select('*')
      .eq('qr_code', qr_code)
      .single();

    if (fetchError || !appointment) {
      throw new Error('Appointment not found for this QR code');
    }

    if (appointment.status !== 'Confirmed') {
      return { message: 'Appointment is not in a Confirmed state' };
    }

    // update status → Completed
    const { error: updateError } = await this.supabase
      .from('appointment')
      .update({ status: 'Completed' })
      .eq('id', appointment.id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Failed to update appointment status');
    }

    return { message: 'Check-in successful', appointmentId: appointment.id };
  }



}