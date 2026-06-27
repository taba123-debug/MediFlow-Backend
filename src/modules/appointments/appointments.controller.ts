import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AppointmentsQueryDto,
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointments.dto';
import { AppointmentsService } from './appointments.service';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Book an appointment using an available slot' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.appointmentsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments' })
  findAll(@Query() query: AppointmentsQueryDto, @CurrentUser() user: any) {
    return this.appointmentsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.appointmentsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment notes' })
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @CurrentUser() user: any) {
    return this.appointmentsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change appointment status' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeAppointmentStatusDto, @CurrentUser() user: any) {
    return this.appointmentsService.changeStatus(id, dto, user);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule an appointment to another available slot' })
  reschedule(@Param('id') id: string, @Body() dto: RescheduleAppointmentDto, @CurrentUser() user: any) {
    return this.appointmentsService.reschedule(id, dto, user);
  }
}
