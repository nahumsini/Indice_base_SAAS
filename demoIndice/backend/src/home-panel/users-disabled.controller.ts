import { Controller, Delete, Post, Put, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { SessionGuard } from '../common/guards/session.guard';
import { UsersService } from './users.service';

@Controller('/api/v1/config-center/users')
@UseGuards(SessionGuard, CsrfGuard)
export class UsersDisabledController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  invite() { return this.usersService.disabled(); }

  @Put(':id')
  update() { return this.usersService.disabled(); }

  @Delete(':id')
  delete() { return this.usersService.disabled(); }

  @Post('invitations/:id/resend')
  resend() { return this.usersService.disabled(); }

  @Delete('invitations/:id')
  deleteInvite() { return this.usersService.disabled(); }
}
