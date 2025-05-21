import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ name: 'qr_code', nullable: true })
  qrCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
