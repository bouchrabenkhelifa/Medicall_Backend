/* eslint-disable prettier/prettier */
import { IsInt, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BookAppointmentDto {
  @IsInt()
  doctorId: number;

  @IsInt()
  patientId: number;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsInt()
  @Min(0)
  @Max(47)
  slotPosition: number;
}