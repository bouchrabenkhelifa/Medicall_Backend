/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity('doctordailyslots')
export class DoctorDailySlots {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'doctor_id' })
  doctorId: number;

  @Column({ name: 'date' })
  date: Date;


  @Column({ name: 'available_slots', type: 'bit', length: 48 })
  availableSlots: string;
}
