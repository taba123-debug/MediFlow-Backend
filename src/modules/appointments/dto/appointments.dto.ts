import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppointmentStatus, ConsultationType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiProperty()
  @IsUUID()
  timeSlotId: string;

  @ApiProperty({ enum: ConsultationType })
  @IsEnum(ConsultationType)
  consultationType: ConsultationType;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty()
  @IsUUID()
  timeSlotId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
