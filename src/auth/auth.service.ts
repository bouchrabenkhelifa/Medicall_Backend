import {
  Injectable, Logger, 
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(AuthService.name);
  private readonly hunterApiKey = '28c97f15fd3421f0acb3305f152d7d2aed0aedd6';
  private readonly googleClient = new OAuth2Client(
    '298268118106-5gqgqk3qtu463s4vhh4ckifielaokmvk.apps.googleusercontent.com', 
  );
constructor(
  private usersService: UsersService,
  private jwtService: JwtService,
  private configService: ConfigService,
) {
  this.supabase = createClient(
    this.configService.get<string>('SUPABASE_URL')!,
    this.configService.get<string>('SUPABASE_KEY')!
  );
}


async updateFcmToken(userId: number, fcmToken: string) {
  const { error } = await this.supabase
    .from('user')
    .update({ fcm_token: fcmToken })
    .eq('id', userId);

  if (error) {
    throw new Error(`Erreur lors de la mise à jour du FCM token : ${error.message}`);
  }
}


  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.finduserByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
async login(email: string, password: string, fcmToken?: string) {
  const user = await this.usersService.finduserByEmail(email);
  if (!user) {
    throw new UnauthorizedException('null');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Mot de passe incorrect.');
  }

  if (fcmToken) {
    try {
      await this.updateFcmToken(user.id, fcmToken);
    } catch (error) {
      this.logger.error(`Erreur mise à jour FCM token: ${error.message}`);
    }
  }

  const payload = { email: user.email, sub: user.id };
  return {
    id: user.id,
    access_token: this.jwtService.sign(payload),
    first_name: user.first_name,
    family_name: user.family_name,
    role: user.role,
  };
}


  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, phone, role = 'user' } = signupDto;

    const isEmailValid = await this.verifyEmailWithHunter(email);
    if (!isEmailValid) {
      throw new ConflictException('Email invalide.');
    }

    const existingUser = await this.usersService.finduserByEmail(email);
    if (existingUser) {
      throw new ConflictException('Utilisateur existe déjà.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data } = await this.usersService.createUser({
      email,
      password: hashedPassword,
      first_name: firstName,
      family_name: lastName,
      phone,
      role,
    });

    return { message: 'Utilisateur créé avec succès', user: data };
  }

  private async verifyEmailWithHunter(email: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
        params: {
          email,
          api_key: this.hunterApiKey,
        },
      });

      const verificationResult = response.data.data.result;
      return verificationResult === 'deliverable';
    } catch (error) {
      console.error('Erreur de vérification avec Hunter.io :', error.message);
      throw new InternalServerErrorException('Échec de la vérification de l\'email.');
    }
  }
  
  async loginWithGoogleToken(idToken: string) {

    this.logger.log(`loginWithGoogleToken appelé avec idToken: ${idToken}`);

    try {
      // Vérification du token Google
      this.logger.log('Appel à verifyIdToken...');
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience:
          '298268118106-5gqgqk3qtu463s4vhh4ckifielaokmvk.apps.googleusercontent.com',
      });

      this.logger.log('verifyIdToken OK, récupération du payload...');
      const payload = ticket.getPayload();
      this.logger.debug(`Payload reçu : ${JSON.stringify(payload)}`);

      if (!payload) {
        this.logger.warn('Payload vide reçu de Google.');
        throw new UnauthorizedException('Google token invalide.');
      }

      // Extrait les infos utiles
      const email = payload.email;
      const nom = payload.name;
      const picture = payload.picture;

      this.logger.log(`Utilisateur Google détecté : ${email} - ${nom}`);

      if (!email) {
        this.logger.warn('Aucun email dans le payload Google.');
        throw new UnauthorizedException('Google token invalide.');
      }

      // Ici, tu peux faire ta logique métier (ex: créer utilisateur, générer token JWT, etc.)
      // Pour l'exemple, on retourne simplement un objet avec les infos

      const user = {
        email,
        nom,
        photo: picture,
      };

      this.logger.log(`Utilisateur authentifié: ${email}`);

      return user;
    } catch (error) {
      this.logger.error('Erreur lors de la vérification du token Google', error.stack);
      throw new UnauthorizedException('Authentification Google échouée.');
    }
  }
}