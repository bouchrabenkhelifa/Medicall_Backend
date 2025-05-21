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
import { ResponseDto, SlotTime, UpdateDoctorDto, WorkingDayDto } from './entities/doctor.entity';
import { BitOperationsUtil } from '../Appointments/utils/bit-operations.util';

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
  //Get Available slot for one day
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
      }
        
        console.log(availableBinaryString)
         // 7. Get the final available slots
      const slots = BitOperationsUtil.getAvailableSlots(availableBinaryString);
      
      // 8. Convert to time format and return
      return slots.map((slotNumber) => ({
        slot: slotNumber,
        time: BitOperationsUtil.slotToTimeString(slotNumber),
      }));
      
      
     
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  //Mark slot as an unvalaible
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
  
  //Fucntions to handle Doctor Information
   /**
   * Update or insert doctor profile information
   */
 async updateDoctorProfile(dto: UpdateDoctorDto, photoFile?: Express.Multer.File) {
  try {
    // 1. Handle optional clinic creation
    let clinicId: number | null = null;
    const hasClinicData = dto.clinicName.trim() && dto.clinicAddress?.trim();
    if (hasClinicData) {
      clinicId = await this.getOrCreateClinic(dto.clinicName, dto.clinicAddress, dto.clinicMap);
    }

    // 2. Upload photo if provided
    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await this.uploadDoctorPhoto(dto.userId, photoFile);
    }
     const days = ['sunday', 'monday', 'wednesday','thursday', 'tuesday'];
    //Case work EveryDay
    if(dto.workEveryDay){
      for (const day of days) {
          
      dto.workingDays.push({
        day,
        isWorking: true,
        startTime: dto.startworkTime,
        endTime: dto.endworkTime,     
      });
    
  }
    }
    console.log(dto.workOnWeekend)
    //Case work on weekends is toggled
   if (dto.workOnWeekend) {
  const weekendDays = ['friday', 'saturday'];
  
  dto.workingDays = (dto.workingDays || []).map(wd => ({
    ...wd,
    ...(weekendDays.includes(wd.day.toLowerCase()) && {
      isWorking: true,
      startTime: dto.startworkTime,
      endTime: dto.endworkTime
    }
  )}));
}
console.log(dto.workingDays)
    // 3. Calculate availability bitmask
    const availability = this.calculateAvailabilityBits(dto.workingDays);
 
    // 4. Prepare doctor update payload
    const doctorUpdate = {
      user_id: dto.userId,
      specialty: dto.specialty,
      contact: dto.contact ?? null,
      experience: dto.experience ?? null,
      availability,
      facebook: dto.facebook ?? null,
      instagram: dto.instagram ?? null,
      linkedin: dto.linkedin ?? null,
      workonweekend: dto.workOnWeekend ?? false,
      clinic_id: clinicId,
      ...(photoUrl ? { photo: photoUrl } : {}),
    };

    // 5. Perform upsert
    const { error } = await this.supabase
      .from('doctor')
      .upsert([doctorUpdate]);

    if (error) {
      throw new Error(`Database upsert error: ${error.message}`);
    }
    console.log()
    // 6. Update doctor's daily slots
    await this.updateDoctorDailySlots(
      this.supabase,
      dto.userId,
      dto.breakstart,
      dto.breakend,
      dto.startworkTime,
      dto.endworkTime,
      dto.workOnWeekend,
      dto.workingDays
    );

    return {
      success: true,
      message: 'Doctor information updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating doctor profile:', error);
    throw new BadRequestException(`Failed to update doctor profile: ${error.message || error}`);
  }
}


  /**
   * Handle clinic information (find existing or create new)
   */
 async getOrCreateClinic(
  name: string,
  address: string,
  mapLocation?: string,
): Promise<number> {
  // 1. Try to find existing clinic by mapLocation
  if (mapLocation) {
    const { data: clinicByLocation, error } = await this.supabase
      .from('clinic')
      .select('id')
      .eq('map_location', mapLocation)
      .maybeSingle();

    if (error) throw new Error(`Failed to query clinic by mapLocation: ${error.message}`);
    if (clinicByLocation) return clinicByLocation.id;
  }

  // 2. Try to find clinic by name and address (case-insensitive)
  const { data: clinics, error: searchError } = await this.supabase
    .from('clinic')
    .select('id')
    .ilike('name', name)
    .ilike('address', address)
    .limit(1);

  if (searchError) throw new Error(`Failed to search clinic: ${searchError.message}`);
  if (clinics && clinics.length > 0) return clinics[0].id;

  // 3. Create new clinic
  const { data: newClinic, error: insertError } = await this.supabase
    .from('clinic')
    .insert([{ name, address, map_location: mapLocation || null }])
    .select('id')
    .single();

  if (insertError) throw new Error(`Failed to insert clinic: ${insertError.message}`);
  return newClinic.id;
}


 

  /**
   * Calculate availability bitstring based on working days
   * Sunday to Thursday - 5 bits
   */
  private calculateAvailabilityBits(workingDays: WorkingDayDto[]): string {
    // Days of week in order from Sunday to Saturday
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

    // Create 5-bit string (for Sunday to Thursday)
    let bitString = '';
    
   const allWorking = !Array.isArray(workingDays) || workingDays.length === 0;

for (const day of daysOfWeek) {
  if (allWorking) {
    bitString += '1';
  } else {
    const workingDay = workingDays.find((wd) => wd.day.toLowerCase() === day);
    console.log(workingDay)
    bitString += workingDay && workingDay.isWorking ? '1' : '0';
  }
}
    console.log(bitString)
    // Convert binary string to Postgres bit string format
    return bitString;
  }

  /**
   * Update or insert doctor daily slots
   */
  private async updateDoctorDailySlots(
  supabase: any,
  doctorId: number,
  breakstart: string,
  breakend: string,
  startworkTime: string,
  endworkTime: string,
  workOnWeekend: boolean,
  workingDays: WorkingDayDto[],
): Promise<void> {

  //Doctor work everyday
  const weekdays = ['sunday','monday', 'tuesday', 'wednesday', 'thursday'];

if (!workingDays || workingDays.length === 0) {
  workingDays = weekdays.map(day => ({
    day,
    isWorking: true,
    startTime: startworkTime, 
    endTime: endworkTime,   
  }));
}

  console.log(workingDays)
  for (const workingDay of workingDays) {
    if (!workingDay.isWorking) {
      console.warn(`Skipping working day with missing 'day':`, workingDay);
      continue;
    }

    const day = workingDay.day.trim().toLowerCase();
    const availableSlots = this.calculateDailySlotsAvailability(breakstart, breakend, workingDay);

    // Check if a record already exists for this doctor and day
    const { data: existing, error: fetchError } = await supabase
      .from('doctordailyslots')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('day', day)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // 'PGRST116' means "no rows found"
      console.error(`Error fetching existing daily slot for ${day}:`, fetchError);
      continue;
    }

    if (existing) {
      // Update
      const { error: updateError } = await supabase
        .from('doctordailyslots')
        .update({ available_slots: availableSlots })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`Failed to update daily slots for ${day}:`, updateError);
      }
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('doctordailyslots')
        .insert([{
          doctor_id: doctorId,
          day,
          available_slots: availableSlots,
        }]);

      if (insertError) {
        console.error(`Failed to insert daily slots for ${day}:`, insertError);
      }
    }
  }
  //Delete all the previou record of working days
 const activeDays = workingDays
  .filter(wd => wd.isWorking)
  .map(wd => wd.day.toLowerCase());
const formattedDays = `(${activeDays.map(day => `"${day}"`).join(',')})`;

// Delete records for this doctor where day is NOT in activeDays
const { error: deleteError } = await supabase
  .from('doctordailyslots')
  .delete()
  .eq('doctor_id', doctorId)
  .not('day', 'in', formattedDays);

if (deleteError) {
  console.error('Failed to delete old daily slots:', deleteError);
}
}

  /**
   * Calculate daily slots availability as a 48-bit string
   * Each bit represents a 30-minute slot (48 slots in 24 hours)
   */
  private calculateDailySlotsAvailability(breakstart: string, breakend: string, workingDay: WorkingDayDto): string {
    // If not working on this day, all slots are unavailable
    if (!workingDay.isWorking) {
      return "B'" + '0'.repeat(48) + "'";
    }

    // Initialize all slots as unavailable
    const slots = Array(48).fill('0');
    // Convert time strings to slot indices (each slot is 30 minutes)
    const startSlot = workingDay.startTime ? this.timeToSlotIndex(workingDay.startTime) : 0;
    const endSlot = workingDay.endTime ? this.timeToSlotIndex(workingDay.endTime) - 1 : 47;
    
    // Mark working hours as available
    for (let i = startSlot; i <= endSlot; i++) {
      slots[i] = '1';
    }
    
   
      const breakStartSlot = this.timeToSlotIndex(breakstart);
      const breakEndSlot = this.timeToSlotIndex(breakend) - 1;
      
      // Mark break time as unavailable
      for (let i = breakStartSlot; i <= breakEndSlot; i++) {
        slots[i] = '0';
      }
    
    console.log(slots.join(''))
    // Return Postgres bit string format
    return slots.join('');
  }

  /**
   * Convert time string (HH:MM) to slot index (0-47)
   */
  private timeToSlotIndex(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 2 + (minutes >= 30 ? 1 : 0);
  }

  /**
   * Upload doctor photo to Supabase storage
   */
  private async uploadDoctorPhoto(
    doctorId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      // Generate a unique filename
      const fileName = `doctor_${doctorId}_${Date.now()}.${
        file.originalname.split('.').pop()
      }`;
      
      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('doctor-photos')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase storage error: ${error.message}`);
      }

      // Get the public URL
      const { data: publicUrl } = this.supabase.storage
        .from('doctor-photos')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading doctor photo:', error);
      throw new BadRequestException(
        `Failed to upload doctor photo: ${error.message}`,
      );
    }
  }

  /**
   * Get doctor profile by ID
   */
  async getDoctorProfile(doctorId: number) {
    try {
      // Get doctor profile
      const doctor = await this.supabase.doctor.findUnique({
        where: {
          user_id: doctorId,
        },
        include: {
          clinic: true,
        },
      });

      if (!doctor) {
        throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
      }

      // Get doctor daily slots
      const dailySlots = await this.supabase.doctordailyslots.findMany({
        where: {
          doctor_id: doctorId,
        },
      });

      // Convert daily slots to working days format
      const workingDays = this.convertDailySlotsToWorkingDays(dailySlots);

      return {
        userId: doctor.user_id,
        specialty: doctor.specialty,
        contact: doctor.contact,
        experience: doctor.experience,
        facebook: doctor.facebook,
        instagram: doctor.instagram,
        linkedin: doctor.linkedin,
        workOnWeekend: doctor.workonweekend,
        photo: doctor.photo,
        clinic: doctor.clinic 
          ? {
              id: doctor.clinic.id,
              name: doctor.clinic.name,
              address: doctor.clinic.address,
              mapLocation: doctor.clinic.map_location,
            }
          : null,
        workingDays,
      };
    } catch (error) {
      console.error('Error getting doctor profile:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get doctor profile: ${error.message}`,
      );
    }
  }

  /**
   * Convert daily slots to working days format
   */
  private convertDailySlotsToWorkingDays(dailySlots: any[]): WorkingDayDto[] {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    
    return days.map(day => {
      const daySlot = dailySlots.find(slot => slot.day === day);
      
      if (!daySlot || !daySlot.available_slots) {
        return {
          day,
          isWorking: false,
        };
      }
      
      // Convert bit string to array of '0' and '1'
      // Example: B'101010...' -> ['1', '0', '1', '0', '1', '0', ...]
      const bitString = daySlot.available_slots.toString().replace(/[^01]/g, '');
      const slots = bitString.split('');
      
      // Find working hours and break time
      const workingPeriods = this.findWorkingPeriods(slots);
      
      if (workingPeriods.length === 0) {
        return {
          day,
          isWorking: false,
        };
      }
      
      if (workingPeriods.length === 1) {
        return {
          day,
          isWorking: true,
          startTime: BitOperationsUtil.slotToTimeString(workingPeriods[0].start),
          endTime:  BitOperationsUtil.slotToTimeString(workingPeriods[0].end + 1), // Add 1 to get end time
        };
      }
      
      // If there are multiple working periods, find the longest break
      const { workStart, workEnd, breakStart, breakEnd } = this.findLongestBreak(workingPeriods);
      
      return {
        day,
        isWorking: true,
        startTime: BitOperationsUtil.slotToTimeString(workStart),
        endTime: BitOperationsUtil.slotToTimeString(workEnd + 1), // Add 1 to get end time
        breakStart: BitOperationsUtil.slotToTimeString(breakStart),
        breakEnd: BitOperationsUtil.slotToTimeString(breakEnd + 1), // Add 1 to get end time
      };
    });
  }

   /**
   * Find working periods in the slot array
   */
  private findWorkingPeriods(slots: string[]): { start: number; end: number }[] {
    const periods : { start: number; end: number }[] = [];
    let start = -1;
    
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === '1' && start === -1) {
        start = i;
      } else if (slots[i] === '0' && start !== -1) {
        periods.push({ start, end: i - 1 });
        start = -1;
      }
    }
    
    if (start !== -1) {
      periods.push({ start, end: slots.length - 1 });
    }
    
    return periods;
  }

  /**
   * Find the longest break between working periods
   */
  private findLongestBreak(periods: { start: number; end: number }[]): {
    workStart: number;
    workEnd: number;
    breakStart: number;
    breakEnd: number;
  } {
    // Sort periods by start time
    periods.sort((a, b) => a.start - b.start);
    
    let longestBreakLength = 0;
    let breakStartIndex = 0;
    let breakEndIndex = 0;
    
    for (let i = 0; i < periods.length - 1; i++) {
      const breakLength = periods[i + 1].start - periods[i].end - 1;
      
      if (breakLength > longestBreakLength) {
        longestBreakLength = breakLength;
        breakStartIndex = periods[i].end + 1;
        breakEndIndex = periods[i + 1].start - 1;
      }
    }
    
    return {
      workStart: periods[0].start,
      workEnd: periods[periods.length - 1].end,
      breakStart: breakStartIndex,
      breakEnd: breakEndIndex,
    };
  }
}