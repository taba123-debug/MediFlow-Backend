import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PatientPortalController } from './patient-portal.controller';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [PrismaModule],
  controllers: [PatientsController, PatientPortalController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
