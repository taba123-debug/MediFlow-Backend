import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AvailabilityQueryDto,
  CreateAvailabilityDto,
  CreateTimeSlotDto,
  TimeSlotsQueryDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';
import { AvailabilityService } from './availability.service';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Post('doctors/:doctorId')
  @ApiOperation({ summary: 'Create recurring availability for a doctor' })
  createAvailability(
    @Param('doctorId') doctorId: string,
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: any,
  ) {
    return this.availabilityService.createAvailability(doctorId, dto, user);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List doctor availabilities' })
  findAvailabilities(@Query() query: AvailabilityQueryDto) {
    return this.availabilityService.findAvailabilities(query);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update availability' })
  updateAvailability(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto, @CurrentUser() user: any) {
    return this.availabilityService.updateAvailability(id, dto, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete availability' })
  removeAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.availabilityService.removeAvailability(id, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Post('slots')
  @ApiOperation({ summary: 'Create a concrete doctor time slot' })
  createTimeSlot(@Body() dto: CreateTimeSlotDto, @CurrentUser() user: any) {
    return this.availabilityService.createTimeSlot(dto, user);
  }

  @Public()
  @Get('slots/list')
  @ApiOperation({ summary: 'List doctor time slots' })
  findTimeSlots(@Query() query: TimeSlotsQueryDto) {
    return this.availabilityService.findTimeSlots(query);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @Delete('slots/:id')
  @ApiOperation({ summary: 'Delete an unbooked time slot' })
  removeTimeSlot(@Param('id') id: string, @CurrentUser() user: any) {
    return this.availabilityService.removeTimeSlot(id, user);
  }
}
