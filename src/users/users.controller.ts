import { Controller, Get, Query, Param } from '@nestjs/common'; 
import { UsersService } from '../users/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('findUser')
  async findUser(@Query('email') email: string) {
    const user = await this.usersService.finduserByEmail(email);
    return user || { message: 'User not found' };
  }

  @Get(':id') 
  async findUserById(@Param('id') id: string) {
    const user = await this.usersService.findUserById(Number(id));
    if (!user) {
      return { message: 'Utilisateur non trouvé' };
    }
    return user;
  }
}
