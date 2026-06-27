import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMedicalRecordDto, MedicalRecordsQueryDto, UpdateMedicalRecordDto } from './dto/medical-records.dto';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Medical Records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a medical record' })
  create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() user: any) {
    return this.medicalRecordsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List medical records' })
  findAll(@Query() query: MedicalRecordsQueryDto, @CurrentUser() user: any) {
    return this.medicalRecordsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medical record' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.medicalRecordsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medical record' })
  update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto, @CurrentUser() user: any) {
    return this.medicalRecordsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medical record' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.medicalRecordsService.remove(id, user);
  }
}
