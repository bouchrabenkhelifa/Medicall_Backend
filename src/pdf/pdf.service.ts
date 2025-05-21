import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePrescriptionPdf(prescriptionData: any): Promise<Buffer> {
    this.logger.log('Starting PDF generation');
    
    return new Promise((resolve, reject) => {
      try {
        // Create a document with simpler configuration
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true // Important for reliable buffering
        });

        this.logger.log('PDF document created');
        
        // Buffer to store PDF data
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          this.logger.log(`PDF generation complete. Buffer size: ${result.length} bytes`);
          resolve(result);
        });
        
        // Error handling
        doc.on('error', (err) => {
          this.logger.error('Error during PDF generation', err);
          reject(err);
        });
        
        // Add logo/header
        doc
          .fontSize(20)
          .text('Medical Prescriptions', { align: 'center' })
          .moveDown(0.5);

        this.logger.log('Added header');

        // Add a horizontal line
        doc
          .moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .stroke()
          .moveDown(1);

        // Patient Information with detailed name fields and age
        doc
          .fontSize(16)
          .text('Patient Information')
          .moveDown(0.5);

        doc.fontSize(12);
        
        // Display detailed patient information if available
        if (prescriptionData.patientFirstName || prescriptionData.patientFamilyName) {
          // If we have first name and family name
          const firstName = prescriptionData.patientFirstName || '';
          const familyName = prescriptionData.patientFamilyName || '';
          doc.text(`Full Name : ${firstName} ${familyName}`);
          
          // Show full name if it's different from first+family combination
          const fullName = prescriptionData.patientName || '';
          if (fullName && fullName !== `${firstName} ${familyName}` && fullName !== 'Unknown Patient') {
            doc.text(`Full Name: ${fullName}`);
          }
        } else {
          // Fallback to the original patient name
          doc.text(`Patient: ${prescriptionData.patientName || 'Unknown'}`);
        }
        
        // Display age with preference for the calculated age
        if (prescriptionData.patientAge) {
          doc.text(`Age: ${prescriptionData.patientAge}`);
        }

        // Format date
        let dateText = 'Date: Not specified';
        if (prescriptionData.date) {
          try {
            const date = new Date(prescriptionData.date);
            dateText = `Date: ${date.toLocaleDateString()}`;
          } catch (e) {
            dateText = `Date: ${prescriptionData.date}`;
          }
        }
        doc.text(dateText).moveDown(1);

        this.logger.log('Added patient information');

        // Diagnosis
        if (prescriptionData.diagnosis) {
          doc
            .fontSize(16)
            .text('Diagnosis')
            .moveDown(0.5);

          doc
            .fontSize(12)
            .text(prescriptionData.diagnosis)
            .moveDown(1);
        }

        // General Instructions
        if (prescriptionData.instructions) {
          doc
            .fontSize(16)
            .text('General Instructions')
            .moveDown(0.5);

          doc
            .fontSize(12)
            .text(prescriptionData.instructions)
            .moveDown(1);
        }

        // Medications
        doc
          .fontSize(16)
          .text(`Medications (${prescriptionData.medications?.length || 0})`)
          .moveDown(0.5);

        this.logger.log('Adding medications');

        // List all medications
        if (prescriptionData.medications && prescriptionData.medications.length > 0) {
          prescriptionData.medications.forEach((med: any, index: number) => {
            doc
              .fontSize(14)
              .text(`${index + 1}. ${med.name}`)
              .moveDown(0.25);

            doc.fontSize(12);
            doc.text(`Dosage: ${med.dosage}`);
            doc.text(`Frequency: ${med.frequency}`);
            
            if (med.duration) {
              doc.text(`Duration: ${med.duration}`);
            }
            
            if (med.instructions) {
              doc.text(`Instructions: ${med.instructions}`);
            }
            
            if (med.specialInstructions) {
              doc.text(`Special Instructions: ${med.specialInstructions}`);
            }

            doc.moveDown(0.5);
          });
        } else {
          doc
            .fontSize(12)
            .text('No medications prescribed.')
            .moveDown(1);
        }

        this.logger.log('Added medications');

        // Footer with disclaimer
        const footerY = doc.page.height - 100;
        doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke();

        doc
          .fontSize(10)
          .text(
            'This document is electronically generated and is part of the electronic medical prescription system.',
            50,
            footerY + 15,
            { align: 'center' }
          );

        this.logger.log('Added footer, finalizing document');

        // End the document - this is crucial for proper PDF generation
        doc.end();
      } catch (error) {
        this.logger.error('Error generating PDF', error);
        reject(error);
      }
    });
  }
}