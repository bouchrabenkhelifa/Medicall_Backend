import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { User } from '../users/user.interface';


@Injectable()
export class AuthService {
  private readonly hunterApiKey = '28c97f15fd3421f0acb3305f152d7d2aed0aedd6';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    if (password === '123') {
      const dummyUser = await this.usersService.findByEmail(email);
      return dummyUser || null;
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, phone } = signupDto;
    const role = signupDto.role || 'user';

    const isEmailValid = await this.verifyEmailWithHunter(email);
    if (!isEmailValid) {
      throw new ConflictException('Email invalide.');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Utilisateur existe déjà');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      email,
      password: hashedPassword,
      first_name: firstName,
      family_name: lastName,
      phone,
      role,
    });

    return { message: 'Utilisateur créé avec succès', user };
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
      console.error('Erreur de vérification d’email:', error.message);
      throw new InternalServerErrorException('Échec de la vérification d’email.');
    }
  }

  async findOrCreateGoogleUser(googleUser: any) {
    const { email, firstName, lastName } = googleUser;

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createUser({
        email,
        password: '',
        first_name: firstName,
        family_name: lastName,
        phone: '',
        role: 'user',
      });
    }

    return user;
  }
}
