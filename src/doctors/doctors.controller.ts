/* eslint-disable prettier/prettier */
/*import { Controller, Get } from '@nestjs/common';
import { DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAllDoctors() {
    return this.doctorsService.findAllDoctors();
  }


}
*/
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorSlotsDto } from '../Appointments/dto/create_doctor_slot.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}


  @Post(':id/slots')
  async setDoctorSlots(@Body() createDto: CreateDoctorSlotsDto) {
    return this.doctorsService.setDoctorSlots(createDto);
  }


  @Get('available/dates')
  async getAvailableDates(
    @Query('doctorId', ParseIntPipe) doctorId: number,
    @Query('start') startDateString: string,
    @Query('end') endDateString: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return this.doctorsService.getAvailableDates(doctorId, startDate, endDate);
  }

}
