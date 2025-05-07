/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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