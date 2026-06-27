import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Min, IsInt } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AvailabilityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  doctorId?: string;
}

export class CreateAvailabilityDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotDurationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityDto extends PartialType(CreateAvailabilityDto) {}

export class CreateTimeSlotDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  availabilityId?: string;

  @ApiProperty()
  @IsDateString()
  slotDate: string;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;
}

export class TimeSlotsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}
