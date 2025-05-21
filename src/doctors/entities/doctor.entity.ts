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
export class UpdateDoctorDto {
  userId: number;
  specialty: string;
  contact?: string;
  experience?: number;
  workOnWeekend: boolean;
  workEveryDay: boolean;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  clinicAddress: string;
  clinicName: string;
  clinicMap?: string;
  breakstart: string;
  breakend: string;
  startworkTime: string;
  endworkTime: string;
  workingDays: WorkingDayDto[];
}
export class WorkingDayDto {
  day: string;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
}