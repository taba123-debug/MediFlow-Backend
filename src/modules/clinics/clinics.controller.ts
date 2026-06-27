import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicsQueryDto, CreateClinicDto, UpdateClinicDto } from './dto/clinics.dto';
import { ClinicsService } from './clinics.service';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List clinics' })
  findAll(@Query() query: ClinicsQueryDto) {
    return this.clinicsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get clinic details' })
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create clinic' })
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update clinic' })
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete clinic' })
  remove(@Param('id') id: string) {
    return this.clinicsService.remove(id);
  }
}
