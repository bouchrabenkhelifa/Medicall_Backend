import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoctorsModule } from './doctors/doctors.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    DoctorsModule, AuthModule, 
  ],
})
export class AppModule {}
