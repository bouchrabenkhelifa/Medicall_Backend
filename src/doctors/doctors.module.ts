/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/*import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';

@Module({
  providers: [DoctorsService],
  controllers: [DoctorsController]
})
export class DoctorsModule {}*/
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entities/doctor.entity';
import { DoctorDailySlots } from '../Appointments/entities/doctor_slot.entity';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Module({
  imports: [
      ConfigModule,
      JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '1h' }, // Token expire en 1 heure
        }),
      }),
    ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
