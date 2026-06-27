import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PrescriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsUUID()
  appointmentId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  diagnosis: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  medications: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}

export class UpdatePrescriptionDto extends PartialType(CreatePrescriptionDto) {}
