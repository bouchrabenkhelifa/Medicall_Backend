import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PdfService],
})
export class PrescriptionsModule {}
