import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MedicalRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty()
  @IsDateString()
  recordDate: string;
}

export class UpdateMedicalRecordDto extends PartialType(CreateMedicalRecordDto) {}
