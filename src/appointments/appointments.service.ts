import { Injectable , BadRequestException, NotFoundException} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import {FirebaseService } from '../firebase/firebase.service';
@Injectable()
export class AppointmentsService {
     private supabase; // Déclare ici

  constructor(
    private configService: ConfigService,
    private FirebaseService: FirebaseService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_KEY')!,
    );
  }
  async GetAll() {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `);
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }
  
    // Aplatir ici
    const flattenedData = data.map(appointment => ({
      id: appointment.id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      date_time: appointment.date_time,
      status: appointment.status,
      qr_code: appointment.qr_code,
      first_name: appointment.patient?.user?.first_name || null,
      family_name: appointment.patient?.user?.family_name || null,
      phone: appointment.patient?.user?.phone || null,
    }));
  
    return flattenedData;
  }


  async getAppointmentsByDoctor(doctorId: number) {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `)
      .eq('doctor_id', doctorId);
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }
  
    const flattenedData = data.map(appointment => ({
      id: appointment.id,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      date_time: appointment.date_time,
      status: appointment.status,
      qr_code: appointment.qr_code,
      created_at: appointment.created_at,
      user_id: appointment.patient?.user_id || null,
      birthdate: appointment.patient?.birthdate || null,
      first_name: appointment.patient?.user?.first_name || null,
      family_name: appointment.patient?.user?.family_name || null,
      phone: appointment.patient?.user?.phone || null,
    }));
  
    return flattenedData;
  }
  async getAppointmentById(id: number) {
    const { data, error } = await this.supabase
      .from('appointment')
      .select(`
        id,
        doctor_id,
        patient_id,
        date_time,
        status,
        qr_code,
        created_at,
        patient(
          user_id,
          birthdate,
          user(
            phone,
            first_name,
            family_name
          )
        )
      `)
      .eq('id', id)
      .single(); 
  
    if (error) {
      console.error(error);
      throw new Error('Erreur lors de la récupération du rendez-vous');
    }
  
    const appointment = {
      id: data.id,
      doctor_id: data.doctor_id,
      patient_id: data.patient_id,
      date_time: data.date_time,
      status: data.status,
      qr_code: data.qr_code,
      created_at: data.created_at,
      user_id: data.patient?.user_id || null,
      birthdate: data.patient?.birthdate || null,
      first_name: data.patient?.user?.first_name || null,
      family_name: data.patient?.user?.family_name || null,
      phone: data.patient?.user?.phone || null,
    };
  
    return appointment;
  }
   
 async cancelAppointment(id: number) {
  const { data: appointment, error } = await this.supabase
    .from('appointment')
    .select(`
      id,
      status,
      patient_id
    `)
    .eq('id', id)
    .single();

  if (error || !appointment) {
    throw new NotFoundException('Rendez-vous introuvable');
  }

  if (appointment.status !== 'Confirmed') {
    throw new BadRequestException('Seuls les rendez-vous confirmés peuvent être annulés');
  }

  const { error: updateError } = await this.supabase
    .from('appointment')
    .update({ status: 'Canceled' })
    .eq('id', id);

  if (updateError) {
    throw new Error('Erreur lors de l\'annulation du rendez-vous');
  }

  const { data: user, error: userError } = await this.supabase
    .from('user')
    .select('fcm_token')
    .eq('id', appointment.patient_id)
    .single();

  if (userError || !user || !user.fcm_token) {
    console.warn('Token FCM non trouvé pour le patient', appointment.patient_id);
    return { message: 'Rendez-vous annulé, mais notification non envoyée (token manquant)' };
  }
  await this.FirebaseService.sendPushNotification(
    user.fcm_token,
    'Rendez-vous annulé',
    'Votre rendez-vous a été annulé.',
    {
      appointmentId: id.toString(),
      type: 'appointment_canceled',
    }
  );

  return { message: 'Rendez-vous annulé avec succès et notification envoyée' };
}

}