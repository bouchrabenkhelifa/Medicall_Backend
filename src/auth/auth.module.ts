/* eslint-disable @typescript-eslint/require-await */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service'; // Tu as déjà UsersService
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './strategies/google.strategy';


@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, // Token expire en 1 heure
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
