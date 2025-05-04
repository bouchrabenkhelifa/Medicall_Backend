import { IsArray, IsNumber, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;
}

export class CreatePrescriptionDto {
  @IsNumber()
  @IsNotEmpty()
  patientId: number;
  
  @IsNumber()
  @IsNotEmpty()
  doctorId: number;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications: MedicationDto[];
}