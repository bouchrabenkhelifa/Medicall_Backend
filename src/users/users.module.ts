import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],  // <-- ajoute exports ici
})
export class UsersModule {}
