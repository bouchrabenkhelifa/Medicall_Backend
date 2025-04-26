import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DoctorsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
        this.configService.get<string>('SUPABASE_URL')!, 
        this.configService.get<string>('SUPABASE_KEY') !  
     );
  }

  async findAllDoctors() {
    const { data: doctors, error: doctorError } = await this.supabase
      .from('doctor')
      .select('*');

    const { data: users, error: userError } = await this.supabase
      .from('user')
      .select('*');

    if (doctorError || userError) {
      throw new Error('Erreur lors de la récupération des données');
    }

    const merged = doctors.map(doc => {
      const user = users.find(u => u.id === doc.user_id);
      return {
        user_id: doc.user_id,
        specialty: doc.specialty,
        photo: doc.photo,
        contact: doc.contact,
        experience: doc.experience,
        availability: doc.availability,
        clinic: doc.clinic,
        first_name: user?.first_name,
        family_name: user?.family_name,
        email: user?.email,
        phone: user?.phone,
        address: user?.address,
      };
    });

    return merged;
  }

  async findAllUsers() {
    const { data, error } = await this.supabase
      .from('user')
      .select('*');

    if (error) {
      throw new Error('Erreur lors de la récupération des utilisateurs');
    }

    return data;
  }
}
