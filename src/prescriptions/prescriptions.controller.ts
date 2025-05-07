import { Controller, Post, Body } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import {CreatePrescriptionDto} from './dto/prescription.dto'

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionService: PrescriptionsService) {}

  @Post()
  async createPrescription(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
  ) {
    const { appointment_id, diagnosis, instructions } = createPrescriptionDto;
    return await this.prescriptionService.createPrescription(appointment_id, diagnosis, instructions);
  }
}
