import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Res,
  NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PdfService } from './pdf.service';

@Controller('prescriptions')
@UseInterceptors(ClassSerializerInterceptor)
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  async create(@Body() createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(createPrescriptionDto);
  }

  @Get('doctor/:doctorId')
  async findByDoctor(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return this.prescriptionsService.findByDoctor(doctorId);
  }

  @Get('patient/:patientId')
  async findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.prescriptionsService.findByPatient(patientId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const prescription = await this.prescriptionsService.findOne(id);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }
    return prescription;
  }

  @Get(':id/pdf')
  async generatePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const prescription = await this.prescriptionsService.findOne(id);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    const pdfBuffer = await this.pdfService.generatePrescriptionPdf(prescription);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="prescription_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.send(pdfBuffer);
  }
  
}