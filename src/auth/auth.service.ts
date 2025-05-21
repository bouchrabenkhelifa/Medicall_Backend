/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, ConflictException, InternalServerErrorException,Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly hunterApiKey = '28c97f15fd3421f0acb3305f152d7d2aed0aedd6'; 
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.finduserByEmail(email);
   
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
  

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    console.log(user.id)
    return {
      id: user.id,  
      access_token: this.jwtService.sign(payload),
      first_name: user.first_name,
      family_name: user.family_name,
      role: user.role,
    };
  }

  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, phone } = signupDto;
    const role = signupDto.role || 'user'; 
    const isEmailValid = await this.verifyEmailWithHunter(email);
    if (!isEmailValid) {
      throw new ConflictException('Email invalide .');
    }
    const existingUser = await this.usersService.finduserByEmail(email);
    if (existingUser) {
      throw new ConflictException('Utilisateur existe déjà');
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
      console.error('Error verifying email with Hunter.io:', error.message);
      throw new InternalServerErrorException('Email verification failed.');
    }
  }

  async findOrCreateGoogleUser(googleUser: any) {
    const { email, firstName, lastName, picture } = googleUser;

    let user = await this.usersService.finduserByEmail(email);

    if (!user) {
      user = await this.usersService.createUser({
        email,
        password: '',
        first_name: firstName,
        family_name: lastName,
        phone: '',
        role: 'user',
      }).then(res => res.data);
    }

    return user; 
}

}