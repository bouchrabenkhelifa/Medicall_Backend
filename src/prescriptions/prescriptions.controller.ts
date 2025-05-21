import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, HttpCode, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  async findAllPrescriptions() {
    return this.prescriptionsService.findAllPrescriptions();
  }

  @Get(':id')
  async findPrescriptionById(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionsService.findPrescriptionById(id);
  }

  @Get(':id/medications')
  async findMedicationsByPrescription(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionsService.findMedicationsByPrescription(id);
  }

  @Get('appointment/:appointmentId')
  async findPrescriptionsByAppointment(@Param('appointmentId', ParseIntPipe) appointmentId: number) {
    return this.prescriptionsService.findPrescriptionsByAppointment(appointmentId);
  }

  @Post()
  async createPrescription(
    @Body() prescriptionData: {
      appointment_id: number;
      name: string;
      medications?: Array<{
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
        duration?: string;
      }>;
    }
  ) {
    return this.prescriptionsService.createPrescription(prescriptionData);
  }

  @Put(':id')
  async updatePrescription(
    @Param('id', ParseIntPipe) id: number,
    @Body() prescriptionData: {
      name?: string;
      medications?: Array<{
        id?: number;
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
        duration?: string;
      }>;
    }
  ) {
    return this.prescriptionsService.updatePrescription(id, prescriptionData);
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePrescription(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionsService.deletePrescription(id);
  }

  @Delete(':id/medications/:medicationId')
  @HttpCode(204)
  async deleteMedicationFromPrescription(
    @Param('id', ParseIntPipe) id: number,
    @Param('medicationId', ParseIntPipe) medicationId: number
  ) {
    return this.prescriptionsService.deleteMedicationFromPrescription(id, medicationId);
  }
 @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPrescriptionPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    try {
      const pdfBuffer = await this.prescriptionsService.generatePrescriptionPdf(id);
      
      // Get prescription details for the filename
      const prescription = await this.prescriptionsService.findPrescriptionById(id);
      
      // Use first name and family name if available
      let fileName = `prescription_${id}`;
      
      if (prescription.patient_first_name && prescription.patient_family_name) {
        fileName += `_${prescription.patient_first_name}_${prescription.patient_family_name}`;
      } else if (prescription.patient_name) {
        fileName += `_${prescription.patient_name.replace(/\s+/g, '_')}`;
      } else {
        fileName += '_Unknown_Patient';
      }
      
      fileName += '.pdf';
      
      // Set headers for file download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString() // Ensure this is a string
      });
      
      // Send the PDF buffer correctly
      res.end(pdfBuffer);
    } catch (error) {
      console.error('Error generating or sending PDF:', error);
      res.status(500).json({ 
        message: 'Error generating PDF', 
        error: error.message 
      });
    }
  }
  @Get('debug')
async debugPrescriptions() {
  try {
    // 1. Get all prescriptions
    const allPrescriptions = await this.prescriptionsService.findAllPrescriptions();
    console.log('All prescriptions:', allPrescriptions);
    
    // 2. Check if there are any prescriptions
    if (allPrescriptions.length === 0) {
      return { 
        message: 'No prescriptions found in the database. Create one first.' 
      };
    }
    
    // 3. If prescriptions exist, get the ID of the first one
    const firstPrescriptionId = allPrescriptions[0].id;
    
    // 4. Try to get details of the first prescription
    try {
      const prescriptionDetails = await this.prescriptionsService.findPrescriptionById(firstPrescriptionId);
      return {
        message: 'Debug successful. Found prescription:',
        firstPrescriptionId,
        prescriptionDetails
      };
    } catch (error) {
      return {
        message: `Error finding prescription with ID ${firstPrescriptionId}`,
        error: error.message
      };
    }
  } catch (error) {
    return {
      message: 'Error debugging prescriptions',
      error: error.message
    };
  }
}
}