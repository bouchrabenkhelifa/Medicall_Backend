/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_KEY')!,
    );
  }
  async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    family_name: string;
    phone: string;
    role: string;
  }) {
    const { email, password, first_name, family_name, phone, role } = userData;
    const { data, error } = await this.supabase
      .from('user')
      .insert([{ email, password, first_name, family_name, phone, role }])
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase (createUser) :', error);
      throw new Error("Erreur Supabase lors de la création de l'utilisateur");
    }

    return { data };
  }

  async finduserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Erreur Supabase (email) :', error);
      return null;
    }

    return data;
  }

  async findUserById(id: number) {
    const { data, error } = await this.supabase
      .from('user')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur Supabase (id) :', error);
      return null;
    }

    return data;
  }
}
