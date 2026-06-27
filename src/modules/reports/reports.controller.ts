import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsQueryDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  revenue(@Query() query: ReportsQueryDto) {
    return this.reportsService.revenue(query);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get appointment status report' })
  appointments(@Query() query: ReportsQueryDto) {
    return this.reportsService.appointments(query);
  }
}
