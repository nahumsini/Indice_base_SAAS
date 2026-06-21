import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { SessionGuard } from '../common/guards/session.guard';
import { SessionContext } from '../common/types/session-context';
import { ConfigCenterService } from './config-center.service';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { UsersService } from './users.service';

@Controller('/api/v1/config-center')
@UseGuards(SessionGuard)
export class ConfigCenterController {
  constructor(
    private readonly configCenterService: ConfigCenterService,
    private readonly usersService: UsersService,
  ) {}

  @Get('current-user')
  currentUser(@CurrentSession() session: SessionContext) {
    return this.configCenterService.getCurrentUser(session);
  }

  @Put('current-user')
  @UseGuards(CsrfGuard)
  updateCurrentUser(@CurrentSession() session: SessionContext, @Body() body: UpdateCurrentUserDto) {
    return this.configCenterService.updateCurrentUser(session, body);
  }

  @Post('current-user/avatar/presign-upload')
  @UseGuards(CsrfGuard)
  presignAvatar() {
    return this.configCenterService.disabled();
  }

  @Get('company')
  company(@CurrentSession() session: SessionContext) {
    return this.configCenterService.getCompany(session);
  }

  @Put('company')
  @UseGuards(CsrfGuard)
  updateCompany(@CurrentSession() session: SessionContext, @Body() body: Record<string, unknown>) {
    return this.configCenterService.updateCompany(session, body);
  }

  @Get('config')
  config(@CurrentSession() session: SessionContext) {
    return this.configCenterService.getConfig(session);
  }

  @Put('business-structure')
  @UseGuards(CsrfGuard)
  saveStructure(@CurrentSession() session: SessionContext, @Body() body: Record<string, unknown>) {
    return this.configCenterService.saveStructure(session, body);
  }

  @Get('users')
  users(@CurrentSession() session: SessionContext) {
    return this.usersService.list(session);
  }
}
