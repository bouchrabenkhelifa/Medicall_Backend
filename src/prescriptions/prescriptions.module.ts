import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PdfModule } from 'src/pdf/pdf.module'; // ✅ Import the PdfModule
import { ConfigModule } from '@nestjs/config'; // Optional, but helpful

@Module({
  imports: [PdfModule, ConfigModule], // ✅ Add PdfModule to imports
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
