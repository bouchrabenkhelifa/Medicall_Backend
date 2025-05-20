import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name); // ✅ Doit être en dehors du constructeur

  constructor(private configService: ConfigService) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      const message = {
        token,
        notification: { title, body },
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification envoyée avec succès : ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Erreur FCM :', error);
      throw new Error('Erreur lors de l’envoi de la notification');
    }
  }

  async sendNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Notification envoyée avec succès : ${response}`);
    } catch (error) {
      this.logger.error('Erreur lors de l’envoi de la notification FCM', error);
      throw new Error('Erreur lors de l’envoi de la notification');
    }
  }
}
