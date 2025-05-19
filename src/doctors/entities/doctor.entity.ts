/* eslint-disable prettier/prettier */
import { Entity, PrimaryColumn, Column} from 'typeorm';

@Entity('doctor')
export class Doctor {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @Column()
  specialty: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  contact: string;

  @Column({ nullable: true })
  experience: number;

  @Column({ nullable: true })
  availability: string;

  @Column({ nullable: true })
  clinic: string;

  @Column({ nullable: true, type: 'text' })
  facebook: string;

  @Column({ nullable: true, type: 'text', array: true })
  instagram: string[];

  @Column({ nullable: true, type: 'text' })
  linkedin: string;

  @Column({ nullable: true })
  workonweekend: boolean;
}
export class ResponseDto {
  status: string;
  message: string;
}
export class SlotTime{
  slot: number;
  time: string;
}
export class CreateOrUpdateDoctorDto {
  user_id: number;
  specialty: string;
  photo?: string;
  contact?: string;
  experience?: number;
  availability?: string;
  clinic_id: number; 
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  workonweekend?: boolean;
}

export class BreakTimeDto {
  start_time: string;
  end_time: string;
}

export class WorkingDayDto {
  day: string;
  is_working: boolean;
  start_time?: string;
  end_time?: string;
  break_times?: BreakTimeDto[];
}