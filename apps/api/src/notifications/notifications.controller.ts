import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get('workshop/:workshopId')
  @ApiOperation({ summary: 'Notificaciones del taller (últimas 50)' })
  findAll(@Param('workshopId') workshopId: string) {
    return this.prisma.notification.findMany({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('workshop/:workshopId/unread-count')
  @ApiOperation({ summary: 'Cantidad de notificaciones sin leer' })
  async unreadCount(@Param('workshopId') workshopId: string) {
    const count = await this.prisma.notification.count({
      where: { workshopId, leida: false },
    });
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  markRead(@Param('id') id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { leida: true },
    });
  }

  @Patch('workshop/:workshopId/read-all')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  async markAllRead(@Param('workshopId') workshopId: string) {
    await this.prisma.notification.updateMany({
      where: { workshopId, leida: false },
      data: { leida: true },
    });
    return { ok: true };
  }
}
