import { Controller, Post, Body } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Controller('notifications')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('send')
  async sendNotification(
    @Body('token') token: string,
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('data') data?: any,
  ) {
    return this.firebaseService.sendPushNotification(token, title, body, data);
  }
}