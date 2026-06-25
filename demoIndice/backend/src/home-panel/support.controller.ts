import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { SessionGuard } from '../common/guards/session.guard';

@Controller('/api/v1')
@UseGuards(SessionGuard)
export class SupportController {
  @Get('notifications')
  notifications() {
    return { items: [], summary: { total_count: 0, unread_count: 0 } };
  }

  @Post('notifications/read-all')
  @UseGuards(CsrfGuard)
  readAllNotifications() {
    return { updated_count: 0 };
  }

  @Get('modules')
  modules() {
    return [
      { slug: 'config_center', name: 'Home Panel', category: 'basic', favorite: true },
    ];
  }
}
