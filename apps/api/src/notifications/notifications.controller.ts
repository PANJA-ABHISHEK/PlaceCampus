import { Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me') list(@Request() req: any, @Query() query: NotificationQueryDto) { return this.notificationsService.listForUser(req.user.id, query); }
  @Get('me/unread-count') unreadCount(@Request() req: any) { return this.notificationsService.unreadCount(req.user.id); }
  @Patch(':id/read') markRead(@Param('id') id: string, @Request() req: any) { return this.notificationsService.markRead(id, req.user.id); }
  @Patch('me/read-all') markAllRead(@Request() req: any) { return this.notificationsService.markAllRead(req.user.id); }
}
