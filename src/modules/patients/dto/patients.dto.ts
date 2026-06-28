import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppointmentStatus, Gender, PaymentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PatientsQueryDto extends PaginationQueryDto {}

export class UpdatePatientProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}

export class PatientSelfUpdateDto extends PartialType(UpdatePatientProfileDto) {}

export class PatientProfileUpdateDto extends PartialType(UpdatePatientProfileDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class PatientDoctorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minFee?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFee?: number;
}

export class PatientDoctorSlotsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class PatientAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CancelPatientAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PatientNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

export class MarkNotificationReadDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === undefined) return true;
    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean = true;
}

export class PatientPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
