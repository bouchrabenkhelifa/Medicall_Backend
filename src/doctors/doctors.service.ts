/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Doctor, ResponseDto } from './entities/doctor.entity';
import { DoctorDailySlots } from '../Appointments/entities/doctor_slot.entity';
import { CreateDoctorSlotsDto } from '../Appointments/dto/create_doctor_slot.dto';
import { BitOperationsUtil } from '../Appointments/utils/bit-operations.util';

/*@Injectable()
export class DoctorsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
        this.configService.get<string>('SUPABASE_URL')!, 
        this.configService.get<string>('SUPABASE_KEY') !  
     );
  }

  async findAllDoctors() {
    const { data: doctors, error: doctorError } = await this.supabase
      .from('doctor')
      .select('*');

    const { data: users, error: userError } = await this.supabase
      .from('user')
      .select('*');

    if (doctorError || userError) {
      throw new Error('Erreur lors de la récupération des données');
    }

    const merged = doctors.map(doc => {
      const user = users.find(u => u.id === doc.user_id);
      return {
        user_id: doc.user_id,
        specialty: doc.specialty,
        photo: doc.photo,
        contact: doc.contact,
        experience: doc.experience,
        availability: doc.availability,
        clinic: doc.clinic,
        first_name: user?.first_name,
        family_name: user?.family_name,
        email: user?.email,
        phone: user?.phone,
        address: user?.address,
      };
    });

    return merged;
  }

  async findAllUsers() {
    const { data, error } = await this.supabase
      .from('user')
      .select('*');

    if (error) {
      throw new Error('Erreur lors de la récupération des utilisateurs');
    }

    return data;
  }
}*/
@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(DoctorDailySlots)
    private doctorDailySlotsRepository: Repository<DoctorDailySlots>,
  ) {}


  /**
   * Sets the available slots for a doctor on a specific date
   */
  async setDoctorSlots(createDto: CreateDoctorSlotsDto): Promise<ResponseDto> {
    try {
      const { doctorId, slotRanges } = createDto;
  
      // Generate bit string from slot ranges
      const availableSlots = BitOperationsUtil.createAvailableBits(slotRanges);
  
      // Check if there's an existing record for this doctor
      let slotsRecord = await this.doctorDailySlotsRepository.findOne({
        where: { doctorId },
      });
  
      if (slotsRecord) {
        // Update existing record
        slotsRecord.availableSlots = availableSlots;
        await this.doctorDailySlotsRepository.save(slotsRecord);
        return {
          status: 'success',
          message: 'Time Slot successfully updated.',
        };
      } else {
        // Create new record
        slotsRecord = this.doctorDailySlotsRepository.create({
          doctorId,
          availableSlots,
        });
        await this.doctorDailySlotsRepository.save(slotsRecord);
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


  /**
   * Gets all available slot dates for a specific doctor
   */
  async getAvailableDates(doctorId: number, startDate: Date, endDate: Date): Promise<Date[] | null> {
    
    try{
    // Find all slots records in date range
    const slotsRecords = await this.doctorDailySlotsRepository.find({
      where: {
        doctorId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
    
    // Return only dates with at least one available slot
    return slotsRecords
      .filter(record => {
        const binaryString = BitOperationsUtil.pgBitToBinaryString(record.availableSlots);
        return BitOperationsUtil.getAvailableSlots(binaryString).length > 0;
      })
      .map(record => record.date);
    } catch (error) { //Error occured
      return null;
    }
  }

  /**
   * Marks a slot as unavailable (when an appointment is booked)
   */
  async markSlotAsUnavailable(doctorId: number, date: Date, slotPosition: number): Promise<boolean> {
 
    // Format date to exclude time
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    
    // Find slots record
    const slotsRecord = await this.doctorDailySlotsRepository.findOne({
      where: {
        doctorId,
        date: formattedDate,
      },
    });
    
    if (!slotsRecord) {
      throw new BadRequestException('No schedule found for this doctor on the specified date');
    }
    
    // Convert PostgreSQL bit string to binary string
    const binaryString = BitOperationsUtil.pgBitToBinaryString(slotsRecord.availableSlots);
    
    // Check if the slot is available
    if (!BitOperationsUtil.isSlotAvailable(binaryString, slotPosition)) {
      throw new BadRequestException('This time slot is not available');
    }
    
    // Mark the slot as unavailable
    const updatedBits = BitOperationsUtil.markSlotAsUnavailable(binaryString, slotPosition);
    slotsRecord.availableSlots = BitOperationsUtil.binaryStringToPgBit(updatedBits);
    
    // Save the updated record
    await this.doctorDailySlotsRepository.save(slotsRecord);
    
    return true;
 
  }
   /**
   * Get the available time slots of a specific date
   */
  async getAvailableSlotsForDate(doctorId: number, date: Date): Promise<number[] | null> {
    try {
      // Format the date to remove time part
      const formattedDate = new Date(date);
      formattedDate.setHours(0, 0, 0, 0);
  
      // Find the slot record for the specific doctor and date
      const slotsRecord = await this.doctorDailySlotsRepository.findOne({
        where: {
          doctorId,
          date: formattedDate,
        },
      });
  
      if (!slotsRecord) {
        return null; // No slots configured for this date
      }
  
      // Convert bit string to binary string
      const binaryString = BitOperationsUtil.pgBitToBinaryString(slotsRecord.availableSlots);
  
      // Return list of available slot positions
      return BitOperationsUtil.getAvailableSlots(binaryString);
    } catch (error) {
      // You can log the error if needed
      return null;
    }
  }
  
}
