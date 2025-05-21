/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ResponseDto, SlotTime,  CreateOrUpdateDoctorDto, WorkingDayDto } from './entities/doctor.entity';
import { BitOperationsUtil } from '../appointments/utils/bit-operations.util';
import { CreateDoctorSlotsDto } from '../appointments/dto/create_doctor_slot.dto';


@Injectable()
export class DoctorsService {

  
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!, 
      this.configService.get<string>('SUPABASE_KEY')!
    );
  }
async findAllDoctors() {
  // Fetch doctors with clinic address (join in a single query)
  const { data: doctorsWithClinics, error: doctorError } = await this.supabase
    .from('doctor')
    .select(`
      *,
      clinic:clinic_id (address)  // Only select address from clinic
    `);

  // Fetch users
  const { data: users, error: userError } = await this.supabase
    .from('user')
    .select('*');

  if (doctorError || userError) {
    throw new Error('Error fetching data');
  }

  // Merge data and flatten clinic address
  return doctorsWithClinics.map(doc => {
    const user = users.find(u => u.id === doc.user_id);
    
    return {
      user_id: doc.user_id,
      specialty: doc.specialty,
      photo: doc.photo,
      contact: doc.contact,
      experience: doc.experience,
      address: doc.clinic?.address,
      first_name: user?.first_name,
      family_name: user?.family_name,
      email: user?.email,
      phone: user?.phone,
      user_address: user?.address,
    };
  });
}
  async setDoctorSlots(createDto: CreateDoctorSlotsDto): Promise<ResponseDto> {
    try {
      const { doctorId, slotRanges } = createDto;
      const availableSlots = BitOperationsUtil.createAvailableBits(slotRanges);

      // Check for existing record
      const { data: existingRecord, error: findError } = await this.supabase
        .from('doctordailyslots')
        .select('*')
        .eq('doctor_id', doctorId)
        .single();

      if (findError && !findError.message.includes('No rows found')) {
        throw findError;
      }

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await this.supabase
          .from('doctordailyslots')
          .update({ available_slots: availableSlots })
          .eq('doctor_id', doctorId);

        if (updateError) throw updateError;

        return {
          status: 'success',
          message: 'Time Slot successfully updated.',
        };
      } else {
        // Create new record
        const { error: insertError } = await this.supabase
          .from('doctordailyslots')
          .insert({
            doctor_id: doctorId,
            available_slots: availableSlots,
          });

        if (insertError) throw insertError;

        return {
          status: 'success',
          message: 'Time Slots successfully added.',
        };
      }
    } catch (error) {
      console.error('Error setting doctor slots:', error);
      return {
        status: 'error',
        message: 'Failed to set time slots. Please try again later.',
      };
    }
  }
//Function to get the doctor working days where he is available
  async getAvailableDates(doctorId: number, startDate: Date, endDate: Date): Promise<Date[] | null> {
    try {
      const { data: slotsRecords, error } = await this.supabase
        .from('doctordailyslots')
        .select('date, available_slots')
        .eq('doctor_id', doctorId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      return slotsRecords
        .filter(record => {
          const binaryString = BitOperationsUtil.pgBitToBinaryString(record.available_slots);
          return BitOperationsUtil.getAvailableSlots(binaryString).length > 0;
        })
        .map(record => new Date(record.date));
    } catch (error) {
      console.error('Error getting available dates:', error);
      return null;
    }
  }
async getAvailableSlotsForDate(doctorId: number, date: Date): Promise<SlotTime [] | null> {
    try {
      // 1. Get the day of week name (e.g., 'monday', 'tuesday')
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[date.getDay()];
      
      // Format the date for appointment lookup
      const formattedDate = new Date(date);
      const year = formattedDate.getFullYear();
      const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
      const day = String(formattedDate.getDate()).padStart(2, '0');
      const dt = `${year}-${month}-${day}`;
      
      // 2. Get doctor's weekly schedule for this day
      const { data: weeklySlot, error: weeklyError } = await this.supabase
        .from('doctordailyslots')
        .select('available_slots')
        .eq('doctor_id', doctorId)
        .eq('day', dayOfWeek)
        .single();
      
      if (weeklyError) {
        if (weeklyError.message.includes('No rows found')) {
          // Doctor doesn't work on this day
          return [];
        }
        throw weeklyError;
      }
      const startOfDay = `${dt} 00:00:00`;
      const endOfDay = `${dt} 23:59:59`;
      // 3. Convert weekly slots to binary string
      const weeklyBinaryString = BitOperationsUtil.pgBitToBinaryString(weeklySlot.available_slots);
      // 4. Get all appointments for this doctor on this date
      const { data: appointments, error: appointmentsError } = await this.supabase
        .from('appointment')
        .select('slot')
        .eq('doctor_id', doctorId)
        .gte('date_time', startOfDay)
        .lte('date_time', endOfDay);
      
      if (appointmentsError) throw appointmentsError;
    
      // 5. Create a copy of the weekly slots binary string
      let availableBinaryString = weeklyBinaryString;
      
      console.log(availableBinaryString)
      // 6. Mark all booked slots as unavailable
      if (appointments != null && appointments.length > 0) {
        
        appointments.forEach(appointment => {
          console.log(appointment.slot)
          availableBinaryString = BitOperationsUtil.markSlotAsUnavailable(
            availableBinaryString, 
            appointment.slot
          );
        });
        console.log(availableBinaryString)
         // 7. Get the final available slots
      const slots = BitOperationsUtil.getAvailableSlots(availableBinaryString);
      
      // 8. Convert to time format and return
      return slots.map((slotNumber) => ({
        slot: slotNumber,
        time: BitOperationsUtil.slotToTimeString(slotNumber),
      }));
      
    }else{
      throw appointmentsError;
    }
      
     
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  async markSlotAsUnavailable(doctorId: number, date: Date, slotPosition: number): Promise<boolean> {
    try {
      // Format the date properly
      const formattedDate = new Date(date);
      const year = formattedDate.getFullYear();
      const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
      const day = String(formattedDate.getDate()).padStart(2, '0');
      const dt = `${year}-${month}-${day}`;
      
      // First check if this slot is actually available
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[date.getDay()];
      
      // Get doctor's schedule for this day
      const { data: weeklySlot, error: weeklyError } = await this.supabase
        .from('doctordailyslots')
        .select('available_slots')
        .eq('doctor_id', doctorId)
        .eq('day', dayOfWeek)
        .single();
      
      if (weeklyError) {
        throw new BadRequestException('Doctor does not work on this day');
      }
      
      // Check if the slot is within working hours
      const weeklyBinaryString = BitOperationsUtil.pgBitToBinaryString(weeklySlot.available_slots);
      if (!BitOperationsUtil.isSlotAvailable(weeklyBinaryString, slotPosition)) {
        throw new BadRequestException('This time slot is outside of doctor working hours');
      }
      
      // Check if the slot is already booked
      const { data: existingAppointment, error: appointmentError } = await this.supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('date', dt)
        .eq('slot_position', slotPosition)
        .single();
      
      if (existingAppointment) {
        throw new BadRequestException('This time slot is already booked');
      }
      
      // Insert new appointment record
      const { error: insertError } = await this.supabase
        .from('appointments')
        .insert({
          doctor_id: doctorId,
          date: dt,
          slot_position: slotPosition,
        });
      
      if (insertError) throw insertError;
      
      return true;
    } catch (error) {
      console.error('Error marking slot as unavailable:', error);
      throw error;
    }
  }
  //Profile Functions
   async getDoctorProfile(doctorId: number) {
    const { data, error } = await this.supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateDoctorProfile(doctorId: number, dto: CreateOrUpdateDoctorDto ) {
    const { data, error } = await this.supabase
      .from('doctors')
      .update(dto)
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDoctorPhoto(doctorId: number, photoUrl: string) {
    const { data, error } = await this.supabase
      .from('doctors')
      .update({ photo_url: photoUrl })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDoctorWorkingDays(doctorId: number) {
    const { data, error } = await this.supabase
      .from('doctor_working_days')
      .select('*')
      .eq('doctor_id', doctorId);

    if (error) throw error;
    return data;
  }

  async updateDoctorWorkingDays(doctorId: number, workingDays: WorkingDayDto[]) {
    // For simplicity: delete old days and insert new ones
    const { error: delError } = await this.supabase
      .from('doctor_working_days')
      .delete()
      .eq('doctor_id', doctorId);

    if (delError) throw delError;

    // Add doctor_id to each object if not present
    const daysToInsert = workingDays.map(day => ({
      ...day,
      doctor_id: doctorId,
    }));

    const { data, error } = await this.supabase
      .from('doctor_working_days')
      .insert(daysToInsert)
      .select();

    if (error) throw error;

    return data;
  }
}