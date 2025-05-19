import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrescriptionsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!, 
      this.configService.get<string>('SUPABASE_KEY')!
    );
  }

  async createPrescription(appointment_id: number, diagnosis: string, instructions: string) {
    const { data, error } = await this.supabase
      .from('prescriptions')
      .insert([
        {
          appointment_id,
          diagnosis,
          instructions,
        }
      ]);

    if (error) {
      throw new Error('Erreur lors de la création de la prescription : ' + error.message);
    }

    return data;
  }
}
