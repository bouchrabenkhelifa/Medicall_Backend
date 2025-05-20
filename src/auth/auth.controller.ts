import { Controller, Post, Body, Get,Patch, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.do';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
constructor(
    private authService: AuthService,
    private jwtService: JwtService, 
  ) {}
 @Patch('fcm-token')
  async updateFcmToken(@Body() body: { userId: number; fcmToken: string }) {
    return this.authService.updateFcmToken(body.userId, body.fcmToken);
  }
  @Post('google')
  async loginWithGoogleToken(@Body() body: { idToken: string }) {
    return this.authService.loginWithGoogleToken(body.idToken);
  }
    @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { email, password, fcm_token } = loginDto;
    return this.authService.login(email, password, fcm_token);
  }
  
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }
/*
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Post('google/login')
  async googleLogin(@Body() body: { email: string, firstName: string, lastName: string, picture?: string }) {
    const user = await this.authService.findOrCreateGoogleUser(body);
    return this.authService.login(user);
  }
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    const user = await this.authService.findOrCreateGoogleUser(req.user);
    return this.authService.login(user); // retourne le token
  }*/

  @Post('logout')
async logout() {
  return { message: 'Déconnecté avec succès' };
}

}
