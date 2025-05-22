/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable , BadRequestException, NotFoundException,Logger} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import {FirebaseService } from '../firebase/firebase.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppointmentsService {
     private supabase; // Déclare ici
 private readonly logger = new Logger(AppointmentsService.name);

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

 async sendReminderForTomorrow() {
    this.logger.log('Envoi des rappels pour tous les rendez-vous de demain');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    this.logger.log(`Recherche des RDV entre ${tomorrowStart.toISOString()} et ${tomorrowEnd.toISOString()}`);

    // Récupérer tous les rendez-vous de demain
    const { data: appointments, error } = await this.supabase
      .from('appointment')
      .select(`
        id, 
        date_time, 
        patient_id, 
        doctor_id
      `)
      .gte('date_time', tomorrowStart.toISOString())
      .lte('date_time', tomorrowEnd.toISOString())

    if (error) {
      this.logger.error('Erreur récupération des rendez-vous:', error);
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }

    this.logger.log(`Nombre de rendez-vous à rappeler demain : ${appointments?.length || 0}`);

    if (!appointments || appointments.length === 0) {
      this.logger.log('Aucun rendez-vous prévu demain');
      return;
    }

    for (const appointment of appointments) {
      try {
        await this.sendNotificationsForAppointment(appointment);
        

        
      } catch (error) {
        this.logger.error(`Erreur pour le RDV ${appointment.id}:`, error);
        // Continuer avec les autres RDV même si un échoue
      }
    }

    this.logger.log('Fin de l\'envoi des rappels pour demain');
  }
   private async sendNotificationsForAppointment(appointment: any) {
    // Récupérer les informations du patient
    const { data: patient, error: patientError } = await this.supabase
      .from('user')
      .select('id, first_name, family_name, fcm_token')
      .eq('id', appointment.patient_id)
      .single();

    if (patientError) {
      this.logger.error(`Erreur récupération patient ${appointment.patient_id}:`, patientError);
    }

    // Récupérer les informations du docteur
    const { data: doctor, error: doctorError } = await this.supabase
      .from('user')
      .select('id, first_name, family_name, fcm_token')
      .eq('id', appointment.doctor_id)
      .single();

    if (doctorError) {
      this.logger.error(`Erreur récupération docteur ${appointment.doctor_id}:`, doctorError);
    }

    const appointmentDate = new Date(appointment.date_time);
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Envoyer notification au patient
    if (patient?.fcm_token) {
      try {
        await this.FirebaseService.sendPushNotification(
          patient.fcm_token,
          'Rappel de rendez-vous - Demain',
      `Bonjour ${patient.first_name}, vous avez RV demain à ${formattedTime} avec le Dr ${doctor?.first_name || ''} ${doctor?.family_name || ''}.`,
          {
            appointmentId: appointment.id.toString(),
            type: 'appointment_reminder_tomorrow',
            date: appointment.date_time,
          }
        );
        this.logger.log(`Notification patient envoyée à ${patient.first_name} (ID: ${appointment.patient_id})`);
      } catch (error) {
        this.logger.error(`Erreur notification patient ${appointment.patient_id}:`, error);
      }
    } else {
      this.logger.warn(`Pas de FCM token pour le patient ${appointment.patient_id}`);
    }

    // Envoyer notification au docteur
    if (doctor?.fcm_token) {
      try {
        await this.FirebaseService.sendPushNotification(
          doctor.fcm_token,
          'Rappel de rendez-vous - Demain',
          `Dr ${doctor.first_name}, vous avez un rendez-vous demain ${formattedTime} avec ${patient?.first_name || 'un patient'}.`,
          {
            appointmentId: appointment.id.toString(),
            type: 'appointment_reminder_tomorrow',
            date: appointment.date_time,
            patientName: patient?.first_name
          }
        );
        this.logger.log(`Notification docteur envoyée à Dr ${doctor.first_name} (ID: ${appointment.doctor_id})`);
      } catch (error) {
        this.logger.error(`Erreur notification docteur ${appointment.doctor_id}:`, error);
      }
    } else {
      this.logger.warn(`Pas de FCM token pour le docteur ${appointment.doctor_id}`);
    }
  }

 

  

  // Cron job : tous les jours à 19h00
  @Cron('0 0 19 * * *') 
  async handleReminderCron() {
    this.logger.log('⏰ Début du cron de rappel quotidien à 19h00');
    try {
      await this.sendReminderForTomorrow();
      this.logger.log('Cron de rappel terminé avec succès');
    } catch (error) {
      this.logger.error('Erreur dans le cron de rappel:', error);
    }
  }

  async getReminderStats() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { count: totalAppointments } = await this.supabase
      .from('appointment')
      .select('*', { count: 'exact', head: true })
      .gte('date_time', tomorrowStart.toISOString())
      .lte('date_time', tomorrowEnd.toISOString());

  
  }

 
}