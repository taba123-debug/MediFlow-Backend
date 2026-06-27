import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DoctorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  minFee?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFee?: number;
}

export class UpdateDoctorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class AdminUpdateDoctorProfileDto extends PartialType(UpdateDoctorProfileDto) {}
