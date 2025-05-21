import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module'; 
import { PdfModule } from './pdf/pdf.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, 
    AuthModule, 
    UsersModule, 
    AppointmentsModule,
    PrescriptionsModule, 
      PdfModule,
  ],
})
export class AppModule {}