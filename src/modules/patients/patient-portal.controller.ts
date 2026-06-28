import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAppointmentDto, RescheduleAppointmentDto } from '../appointments/dto/appointments.dto';
import { CreateReviewDto, UpdateReviewDto } from '../reviews/dto/reviews.dto';
import {
  CancelPatientAppointmentDto,
  MarkNotificationReadDto,
  PatientAppointmentsQueryDto,
  PatientDoctorSlotsQueryDto,
  PatientDoctorsQueryDto,
  PatientNotificationsQueryDto,
  PatientPaymentsQueryDto,
  PatientProfileUpdateDto,
} from './dto/patients.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patient Portal')
@ApiBearerAuth()
@Roles(UserRole.PATIENT)
@Controller('patient')
export class PatientPortalController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the patient dashboard' })
  getDashboard(@CurrentUser() user: any) {
    return this.patientsService.getDashboard(user);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get the current patient profile' })
  getProfile(@CurrentUser() user: any) {
    return this.patientsService.getProfile(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current patient profile' })
  updateProfile(@Body() dto: PatientProfileUpdateDto, @CurrentUser() user: any) {
    return this.patientsService.updateProfile(user, dto);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Discover doctors for patients' })
  getDoctors(@Query() query: PatientDoctorsQueryDto) {
    return this.patientsService.getDoctors(query);
  }

  @Get('doctors/:doctorId/slots')
  @ApiOperation({ summary: 'Get a doctor availability slots for a date' })
  getDoctorSlots(@Param('doctorId') doctorId: string, @Query() query: PatientDoctorSlotsQueryDto) {
    return this.patientsService.getDoctorSlots(doctorId, query);
  }

  @Get('doctors/:doctorId')
  @ApiOperation({ summary: 'Get doctor details for patient booking flows' })
  getDoctor(@Param('doctorId') doctorId: string) {
    return this.patientsService.getDoctor(doctorId);
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Create a patient appointment' })
  createAppointment(@Body() dto: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.patientsService.createAppointment(user, dto);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List patient appointments' })
  getAppointments(@Query() query: PatientAppointmentsQueryDto, @CurrentUser() user: any) {
    return this.patientsService.getAppointments(user, query);
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get patient appointment details' })
  getAppointment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getAppointment(user, id);
  }

  @Patch('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a patient appointment' })
  cancelAppointment(
    @Param('id') id: string,
    @Body() dto: CancelPatientAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.cancelAppointment(user, id, dto);
  }

  @Patch('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule a patient appointment' })
  rescheduleAppointment(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.rescheduleAppointment(user, id, dto);
  }

  @Get('medical-records')
  @ApiOperation({ summary: 'List patient medical records' })
  getMedicalRecords(@Query() query: PatientAppointmentsQueryDto, @CurrentUser() user: any) {
    return this.patientsService.getMedicalRecords(user, query);
  }

  @Get('medical-records/:id')
  @ApiOperation({ summary: 'Get one patient medical record' })
  getMedicalRecord(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getMedicalRecord(user, id);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List patient reviews' })
  getReviews(@Query() query: PatientAppointmentsQueryDto, @CurrentUser() user: any) {
    return this.patientsService.getReviews(user, query);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Create a patient review' })
  createReview(@Body() dto: CreateReviewDto, @CurrentUser() user: any) {
    return this.patientsService.createReview(user, dto);
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Update a patient review' })
  updateReview(@Param('id') id: string, @Body() dto: UpdateReviewDto, @CurrentUser() user: any) {
    return this.patientsService.updateReview(user, id, dto);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a patient review' })
  removeReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.removeReview(user, id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List patient notifications' })
  getNotifications(@Query() query: PatientNotificationsQueryDto, @CurrentUser() user: any) {
    return this.patientsService.getNotifications(user, query);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  readAllNotifications(@CurrentUser() user: any) {
    return this.patientsService.readAllNotifications(user);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  readNotification(
    @Param('id') id: string,
    @Body() dto: MarkNotificationReadDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.readNotification(user, id, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List patient payments' })
  getPayments(@Query() query: PatientPaymentsQueryDto, @CurrentUser() user: any) {
    return this.patientsService.getPayments(user, query);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get patient payment details' })
  getPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getPayment(user, id);
  }
}
