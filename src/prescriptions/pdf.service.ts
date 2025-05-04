import { Injectable } from '@nestjs/common';
import { PrescriptionDto } from './dto/prescription.dto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  async generatePrescriptionPdf(prescription: PrescriptionDto): Promise<Buffer> {
    return new Promise((resolve) => {
      const pdfBuffer: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });
      
      // Collect PDF data chunks
      doc.on('data', (chunk) => pdfBuffer.push(chunk));
      
      // Resolve with the complete PDF data
      doc.on('end', () => {
        const pdf = Buffer.concat(pdfBuffer);
        resolve(pdf);
      });
      
      // Add content to PDF
      this.addPrescriptionToPdf(doc, prescription);
      
      // Finalize the PDF
      doc.end();
    });
  }
  
  private addPrescriptionToPdf(doc: PDFKit.PDFDocument, prescription: PrescriptionDto): void {
    // Add title
    doc.fontSize(20).text('Medical Prescription', { align: 'center' });
    doc.moveDown();
    
    // Add date
    doc.fontSize(12).text(`Date: ${prescription.createdAt.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    // Add prescription ID
    doc.fontSize(10).text(`Prescription ID: ${prescription.id}`, { align: 'right' });
    doc.moveDown(2);
    
    // Add diagnosis if available
    if (prescription.diagnosis) {
      doc.fontSize(14).text('Diagnosis:');
      doc.fontSize(12).text(prescription.diagnosis);
      doc.moveDown();
    }
    
    // Add medications
    doc.fontSize(14).text('Medications:');
    doc.moveDown(0.5);
    
    prescription.medications.forEach((medication, index) => {
      doc.fontSize(12).text(`${index + 1}. ${medication.name}`);
      doc.fontSize(10).text(`   Dosage: ${medication.dosage}`);
      doc.fontSize(10).text(`   Frequency: ${medication.frequency}`);
      
      if (medication.duration) {
        doc.fontSize(10).text(`   Duration: ${medication.duration}`);
      }
      
      if (medication.specialInstructions) {
        doc.fontSize(10).text(`   Special Instructions: ${medication.specialInstructions}`);
      }
      
      doc.moveDown(0.5);
    });
    
    // Add general instructions if available
    if (prescription.instructions) {
      doc.moveDown();
      doc.fontSize(14).text('General Instructions:');
      doc.fontSize(12).text(prescription.instructions);
    }
    
    // Add footer with signature area
    doc.moveDown(3);
    doc.fontSize(12).text('Doctor\'s Signature:', { align: 'right' });
    doc.moveDown();
    doc.fontSize(12).text('____________________', { align: 'right' });
  }
}
