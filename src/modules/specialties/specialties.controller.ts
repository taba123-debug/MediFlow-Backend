import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateSpecialtyDto, SpecialtiesQueryDto, UpdateSpecialtyDto } from './dto/specialties.dto';
import { SpecialtiesService } from './specialties.service';

@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List specialties' })
  findAll(@Query() query: SpecialtiesQueryDto) {
    return this.specialtiesService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get specialty details' })
  findOne(@Param('id') id: string) {
    return this.specialtiesService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a specialty' })
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a specialty' })
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specialty' })
  remove(@Param('id') id: string) {
    return this.specialtiesService.remove(id);
  }
}
