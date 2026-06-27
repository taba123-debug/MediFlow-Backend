import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PatientsQueryDto, UpdatePatientProfileDto } from './dto/patients.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'List patient profiles' })
  findAll(@Query() query: PatientsQueryDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient profile' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient profile' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientProfileDto, @CurrentUser() user: any) {
    return this.patientsService.update(id, dto, user);
  }
}
