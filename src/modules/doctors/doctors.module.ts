import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DoctorPortalController } from './doctor-portal.controller';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorsController, DoctorPortalController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
