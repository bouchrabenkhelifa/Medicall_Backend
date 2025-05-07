/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  IsInt,
  IsDate,
  IsString,
  IsArray,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SlotRangeDto {
  @IsInt()
  @Min(0)
  @Max(47)
  startSlot: number;

  @IsInt()
  @Min(0)
  @Max(47)
  endSlot: number;
}

export class CreateDoctorSlotsDto {
  @IsInt()
  doctorId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotRangeDto)
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  slotRanges: SlotRangeDto[];
}
