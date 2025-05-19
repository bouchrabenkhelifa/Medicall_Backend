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
import { Controller, Get, Post, Body, Query, Param, Put, UseInterceptors } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorSlotsDto } from '../Appointments/dto/create_doctor_slot.dto';
import { ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import {  CreateOrUpdateDoctorDto, WorkingDayDto } from './entities/doctor.entity';

@Controller('doctors')
export class DoctorsController {
  doctorService: any;
  constructor(private readonly doctorsService: DoctorsService) {}


  @Post('/slots')
  async setDoctorSlots(@Body() createDto: CreateDoctorSlotsDto) {
    return this.doctorsService.setDoctorSlots(createDto);
  }

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

  ///Profile Endpoints
  @Get(':doctorId')
  async getDoctorProfile(@Param('doctorId') doctorId: number) {
    return this.doctorsService.getDoctorProfile(doctorId);
  }

 
  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/doctor-photos',
        filename: (req, file, cb) => {
          // Generate unique file name
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        // Accept only images
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  /*async uploadDoctorPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body('doctorId') doctorId: number,
  ) {
    const photoUrl = `${process.env.API_URL}/uploads/doctor-photos/${file.filename}`;
    await this.doctorService.updateDoctorPhoto(doctorId, photoUrl);
    return { photo_url: photoUrl };
  }*/

  @Get(':doctorId/working-days')
  async getDoctorWorkingDays(@Param('doctorId') doctorId: number) {
    return this.doctorService.getDoctorWorkingDays(doctorId);
  }

  @Put(':doctorId/working-days')
  async updateDoctorWorkingDays(
    @Param('doctorId') doctorId: number,
    @Body() workingDays: WorkingDayDto[],
  ) {
    return this.doctorService.updateDoctorWorkingDays(doctorId, workingDays);
  }
  @Post('update')
  async updateDoctorInfo(
    @Body() doctor: CreateOrUpdateDoctorDto,
  ) {
    return this.doctorService.updateDoctorWorkingDays(CreateOrUpdateDoctorDto);
  }

}
function diskStorage(arg0: { destination: string; filename: (req: any, file: any, cb: any) => void; }): any {
  throw new Error('Function not implemented.');
}

function uuidv4() {
  throw new Error('Function not implemented.');
}

function UploadedFile(): (target: DoctorsController, propertyKey: "uploadDoctorPhoto", parameterIndex: 0) => void {
  throw new Error('Function not implemented.');
}

