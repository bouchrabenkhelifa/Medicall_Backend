/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { Controller, Get, Post, Body, Query, Param, Put, UseInterceptors, HttpCode, HttpStatus, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CreateDoctorSlotsDto } from '../Appointments/dto/create_doctor_slot.dto';
import { ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { UpdateDoctorDto } from './entities/doctor.entity';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

    @Get()
  async findAllDoctors() {
    return this.doctorsService.findAllDoctors();
  }


//Get Doctor availabilty
  @Get(':id/:date/available-slots')
async getAvailableSlotsForDate(
  @Param('id', ParseIntPipe) doctorId: number,
  @Param('date') dateString: string
) {
  const date = new Date(dateString);
  return this.doctorsService.getAvailableSlotsForDate(doctorId, date);
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

//Get and Set doctor Information and availability
@Post('update')
@UseInterceptors(FileInterceptor('photo'))
async updateDoctorProfile(
  @Body() body: { data: string },
  @UploadedFile() photo?: Express.Multer.File,
) {
  
  if (!body?.data) {
    throw new BadRequestException("Missing 'data' field");
  }

  let doctorData: UpdateDoctorDto;
  try {
    doctorData = JSON.parse(body.data);
  } catch (error) {
    throw new BadRequestException("Invalid JSON in 'data' field");
  }
  // Ensure the service is available
  if (!this.doctorsService) {
    throw new Error('DoctorService not injected!');
  }
  console.log(doctorData.workingDays)
  return this.doctorsService.updateDoctorProfile(doctorData, photo);
}

  @Get(':id')
  async getDoctorProfile(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.getDoctorProfile(id);
  }

}
