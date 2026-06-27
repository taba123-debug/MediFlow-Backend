import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DoctorsQueryDto, UpdateDoctorProfileDto } from './dto/doctors.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List doctors with filters' })
  findAll(@Query() query: DoctorsQueryDto) {
    return this.doctorsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get doctor details' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update doctor profile' })
  update(@Param('id') id: string, @Body() dto: UpdateDoctorProfileDto, @CurrentUser() user: any) {
    return this.doctorsService.update(id, dto, user);
  }
}
