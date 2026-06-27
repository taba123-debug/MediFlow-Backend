import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
