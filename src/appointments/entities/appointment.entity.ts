/* eslint-disable prettier/prettier */
 
/* eslint-disable prettier/prettier */
 
 
/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity('appointment')
export class Appointment {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'doctor_id' })
  doctorId: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({ name: 'slot' })
  slot: number;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'qr_code' })
  qr_code: string;

 @Column({ name: 'created_at' })
  created_at: Date

}
export class AppointmentResponseDto {
  status: string;
  message: string;
}