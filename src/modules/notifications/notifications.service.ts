import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, NotificationsQueryDto, UpdateNotificationDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  async findAll(query: NotificationsQueryDto, user: AuthUser) {
    const { skip, take } = buildPagination(query);
    const where = {
      userId: user.role === UserRole.ADMIN && query.search ? undefined : user.sub,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async update(id: string, dto: UpdateNotificationDto, user: AuthUser) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found.');
    if (user.role !== UserRole.ADMIN && notification.userId !== user.sub) {
      throw new ForbiddenException('You can only update your own notifications.');
    }
    return this.prisma.notification.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found.');
    if (user.role !== UserRole.ADMIN && notification.userId !== user.sub) {
      throw new ForbiddenException('You can only delete your own notifications.');
    }
    return this.prisma.notification.delete({ where: { id } });
  }
}
