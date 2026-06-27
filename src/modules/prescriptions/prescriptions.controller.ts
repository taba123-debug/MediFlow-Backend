import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePrescriptionDto, PrescriptionsQueryDto, UpdatePrescriptionDto } from './dto/prescriptions.dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a prescription for a completed appointment' })
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: any) {
    return this.prescriptionsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List prescriptions' })
  findAll(@Query() query: PrescriptionsQueryDto, @CurrentUser() user: any) {
    return this.prescriptionsService.findAll(query, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a prescription' })
  update(@Param('id') id: string, @Body() dto: UpdatePrescriptionDto, @CurrentUser() user: any) {
    return this.prescriptionsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a prescription' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prescriptionsService.remove(id, user);
  }
}
