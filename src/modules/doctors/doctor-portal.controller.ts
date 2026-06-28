import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChangeAppointmentStatusDto, RescheduleAppointmentDto } from '../appointments/dto/appointments.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from '../availability/dto/availability.dto';
import {
  DoctorAppointmentsQueryDto,
  DoctorCreateMedicalRecordDto,
  DoctorCreatePrescriptionDto,
  DoctorCreateTimeSlotDto,
  DoctorEarningsQueryDto,
  DoctorPatientsQueryDto,
  DoctorPaymentsQueryDto,
  DoctorPrescriptionsQueryDto,
  DoctorProfileUpdateDto,
  DoctorRecordsQueryDto,
  DoctorSlotsQueryDto,
  DoctorUpdateMedicalRecordDto,
  DoctorUpdatePrescriptionDto,
} from './dto/doctors.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctor Portal')
@ApiBearerAuth()
@Roles(UserRole.DOCTOR)
@Controller('doctor')
export class DoctorPortalController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get doctor dashboard' })
  getDashboard(@CurrentUser() user: any) {
    return this.doctorsService.getDoctorDashboard(user);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current doctor profile' })
  getProfile(@CurrentUser() user: any) {
    return this.doctorsService.getDoctorProfile(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current doctor profile' })
  updateProfile(@Body() dto: DoctorProfileUpdateDto, @CurrentUser() user: any) {
    return this.doctorsService.updateDoctorProfile(user, dto);
  }

  @Get('availability')
  @ApiOperation({ summary: 'List doctor recurring availability' })
  getAvailability(@CurrentUser() user: any, @Query() query: DoctorSlotsQueryDto) {
    return this.doctorsService.getDoctorAvailability(user, query);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Create recurring doctor availability' })
  createAvailability(@Body() dto: CreateAvailabilityDto, @CurrentUser() user: any) {
    return this.doctorsService.createDoctorAvailability(user, dto);
  }

  @Patch('availability/:id')
  @ApiOperation({ summary: 'Update recurring doctor availability' })
  updateAvailability(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto, @CurrentUser() user: any) {
    return this.doctorsService.updateDoctorAvailability(user, id, dto);
  }

  @Delete('availability/:id')
  @ApiOperation({ summary: 'Delete recurring doctor availability' })
  deleteAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.deleteDoctorAvailability(user, id);
  }

  @Get('slots')
  @ApiOperation({ summary: 'List doctor time slots' })
  getSlots(@CurrentUser() user: any, @Query() query: DoctorSlotsQueryDto) {
    return this.doctorsService.getDoctorSlots(user, query);
  }

  @Post('slots')
  @ApiOperation({ summary: 'Create doctor time slot' })
  createSlot(@Body() dto: DoctorCreateTimeSlotDto, @CurrentUser() user: any) {
    return this.doctorsService.createDoctorSlot(user, dto);
  }

  @Delete('slots/:id')
  @ApiOperation({ summary: 'Delete doctor time slot' })
  deleteSlot(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.deleteDoctorSlot(user, id);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List doctor appointments' })
  getAppointments(@Query() query: DoctorAppointmentsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorAppointments(user, query);
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get doctor appointment details' })
  getAppointment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorAppointment(user, id);
  }

  @Patch('appointments/:id/status')
  @ApiOperation({ summary: 'Change doctor appointment status' })
  changeAppointmentStatus(
    @Param('id') id: string,
    @Body() dto: ChangeAppointmentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.doctorsService.changeDoctorAppointmentStatus(user, id, dto);
  }

  @Patch('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule doctor appointment' })
  rescheduleAppointment(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.doctorsService.rescheduleDoctorAppointment(user, id, dto);
  }

  @Get('patients')
  @ApiOperation({ summary: 'List doctor patients' })
  getPatients(@Query() query: DoctorPatientsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorPatients(user, query);
  }

  @Get('patients/:id')
  @ApiOperation({ summary: 'Get doctor patient details' })
  getPatient(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorPatient(user, id);
  }

  @Post('medical-records')
  @ApiOperation({ summary: 'Create doctor medical record' })
  createMedicalRecord(@Body() dto: DoctorCreateMedicalRecordDto, @CurrentUser() user: any) {
    return this.doctorsService.createDoctorMedicalRecord(user, dto);
  }

  @Get('medical-records')
  @ApiOperation({ summary: 'List doctor medical records' })
  getMedicalRecords(@Query() query: DoctorRecordsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorMedicalRecords(user, query);
  }

  @Get('medical-records/:id')
  @ApiOperation({ summary: 'Get doctor medical record details' })
  getMedicalRecord(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorMedicalRecord(user, id);
  }

  @Patch('medical-records/:id')
  @ApiOperation({ summary: 'Update doctor medical record' })
  updateMedicalRecord(
    @Param('id') id: string,
    @Body() dto: DoctorUpdateMedicalRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.doctorsService.updateDoctorMedicalRecord(user, id, dto);
  }

  @Post('prescriptions')
  @ApiOperation({ summary: 'Create doctor prescription' })
  createPrescription(@Body() dto: DoctorCreatePrescriptionDto, @CurrentUser() user: any) {
    return this.doctorsService.createDoctorPrescription(user, dto);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'List doctor prescriptions' })
  getPrescriptions(@Query() query: DoctorPrescriptionsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorPrescriptions(user, query);
  }

  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get doctor prescription details' })
  getPrescription(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorPrescription(user, id);
  }

  @Patch('prescriptions/:id')
  @ApiOperation({ summary: 'Update doctor prescription' })
  updatePrescription(
    @Param('id') id: string,
    @Body() dto: DoctorUpdatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.doctorsService.updateDoctorPrescription(user, id, dto);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get doctor earnings summary' })
  getEarnings(@Query() query: DoctorEarningsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorEarnings(user, query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List doctor payments' })
  getPayments(@Query() query: DoctorPaymentsQueryDto, @CurrentUser() user: any) {
    return this.doctorsService.getDoctorPayments(user, query);
  }
}
