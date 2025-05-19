import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';

@Module({
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController]
})
export class PrescriptionsModule {}
