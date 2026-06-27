import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateNotificationDto, NotificationsQueryDto, UpdateNotificationDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create notification' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  findAll(@Query() query: NotificationsQueryDto, @CurrentUser() user: any) {
    return this.notificationsService.findAll(query, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification status' })
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto, @CurrentUser() user: any) {
    return this.notificationsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, user);
  }
}
