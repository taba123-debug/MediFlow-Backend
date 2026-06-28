import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
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
  PatientsQueryDto,
  UpdatePatientProfileDto,
} from './dto/patients.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PatientsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = query.search
      ? {
          user: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          },
        }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientProfile.findMany({
        where,
        skip,
        take,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patientProfile.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string, user: AuthUser) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: true,
        appointments: true,
        medicalRecords: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    if (user.role === UserRole.PATIENT && patient.userId !== user.sub) {
      throw new ForbiddenException('You can only access your own patient profile.');
    }

    return patient;
  }

  async update(id: string, dto: UpdatePatientProfileDto, user: AuthUser) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    if (user.role === UserRole.PATIENT && patient.userId !== user.sub) {
      throw new ForbiddenException('You can only update your own patient profile.');
    }

    return this.prisma.patientProfile.update({
      where: { id },
      data: {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
      include: { user: true },
    });
  }

  async getDashboard(user: AuthUser) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const now = new Date();

    const [upcomingAppointmentsCount, medicalRecordsCount, unreadNotificationsCount, completedAppointmentsCount] =
      await this.prisma.$transaction([
        this.prisma.appointment.count({
          where: {
            patientId: patientProfile.id,
            scheduledStartAt: { gte: now },
            status: { in: this.activeAppointmentStatuses },
          },
        }),
        this.prisma.medicalRecord.count({ where: { patientId: patientProfile.id } }),
        this.prisma.notification.count({ where: { userId: user.sub, isRead: false } }),
        this.prisma.appointment.count({
          where: { patientId: patientProfile.id, status: AppointmentStatus.COMPLETED },
        }),
      ]);

    const [upcomingAppointments, recommendedDoctors, notificationsPreview] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: {
          patientId: patientProfile.id,
          scheduledStartAt: { gte: now },
          status: { in: this.activeAppointmentStatuses },
        },
        include: {
          doctor: { include: { user: true, specialty: true, clinic: true } },
          clinic: true,
        },
        orderBy: { scheduledStartAt: 'asc' },
        take: 5,
      }),
      this.prisma.doctorProfile.findMany({
        where: { isVerified: true },
        include: { user: true, specialty: true, clinic: true },
        orderBy: [{ ratingAverage: 'desc' }, { reviewsCount: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.notification.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      profile: {
        userId: patientProfile.user.id,
        patientId: patientProfile.id,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
      },
      stats: {
        upcomingAppointments: upcomingAppointmentsCount,
        medicalRecords: medicalRecordsCount,
        unreadNotifications: unreadNotificationsCount,
        completedAppointments: completedAppointmentsCount,
      },
      upcomingAppointments: upcomingAppointments.map((appointment) =>
        this.mapDashboardAppointment(appointment),
      ),
      recommendedDoctors: recommendedDoctors.map((doctor) => this.mapDoctorListItem(doctor)),
      notificationsPreview: notificationsPreview.map((notification) =>
        this.mapNotificationItem(notification),
      ),
    };
  }

  async getProfile(user: AuthUser) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    return this.mapPatientProfileResponse(patientProfile);
  }

  async updateProfile(user: AuthUser, dto: PatientProfileUpdateDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);

    const [updatedUser, updatedPatientProfile] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: patientProfile.userId },
        data: {
          name: dto.name,
          phone: dto.phone,
          location: dto.location,
          avatarUrl: dto.avatarUrl,
        },
      }),
      this.prisma.patientProfile.update({
        where: { id: patientProfile.id },
        data: {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
          address: dto.address,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
        },
      }),
    ]);

    return this.mapPatientProfileResponse({
      ...updatedPatientProfile,
      user: updatedUser,
    });
  }

  async getDoctors(query: PatientDoctorsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where: Prisma.DoctorProfileWhereInput = {
      specialtyId: query.specialtyId,
      clinicId: query.clinicId,
      ...(query.minFee !== undefined || query.maxFee !== undefined
        ? {
            consultationFee: {
              ...(query.minFee !== undefined
                ? { gte: new Prisma.Decimal(query.minFee) }
                : {}),
              ...(query.maxFee !== undefined
                ? { lte: new Prisma.Decimal(query.maxFee) }
                : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { user: { name: { contains: query.search, mode: 'insensitive' } } },
              { specialty: { name: { contains: query.search, mode: 'insensitive' } } },
              { clinic: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorProfile.findMany({
        where,
        skip,
        take,
        include: {
          user: true,
          specialty: true,
          clinic: true,
        },
        orderBy: [{ ratingAverage: 'desc' }, { reviewsCount: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((doctor) => this.mapDoctorListItem(doctor)),
      total,
      query,
    );
  }

  async getDoctor(doctorId: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
        specialty: true,
        clinic: true,
        reviews: {
          include: {
            patient: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    const slots = await this.prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        isActive: true,
        isBooked: false,
        startAt: { gte: new Date() },
      },
      orderBy: { startAt: 'asc' },
    });

    const availableDates = [...new Set(slots.map((slot) => this.formatDate(slot.slotDate)))];

    return {
      doctorId: doctor.id,
      name: doctor.user.name,
      specialty: doctor.specialty.name,
      clinic: doctor.clinic
        ? {
            id: doctor.clinic.id,
            name: doctor.clinic.name,
            address: doctor.clinic.address,
          }
        : null,
      experienceYears: doctor.experienceYears,
      consultationFee: this.toNumber(doctor.consultationFee),
      qualification: doctor.qualification,
      about: doctor.about,
      rating: this.toNumber(doctor.ratingAverage),
      reviews: doctor.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        patient: {
          id: review.patient.id,
          name: review.patient.user.name,
        },
      })),
      availableDates,
    };
  }

  async getDoctorSlots(doctorId: string, query: PatientDoctorSlotsQueryDto) {
    await this.ensureDoctorExists(doctorId);

    const where: Prisma.DoctorTimeSlotWhereInput = {
      doctorId,
      isActive: true,
      startAt: { gte: new Date() },
    };

    if (query.date) {
      where.slotDate = {
        gte: this.startOfDay(query.date),
        lt: this.endOfDayExclusive(query.date),
      };
    }

    const slots = await this.prisma.doctorTimeSlot.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });

    return {
      doctorId,
      date: query.date ?? null,
      slots: slots.map((slot) => ({
        slotId: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        isBooked: slot.isBooked,
      })),
    };
  }

  async createAppointment(user: AuthUser, dto: CreateAppointmentDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: dto.doctorId },
      include: { user: true, clinic: true },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    const slot = await this.prisma.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
    if (!slot || !slot.isActive) throw new NotFoundException('Time slot not found.');
    if (slot.doctorId !== dto.doctorId) {
      throw new BadRequestException('Selected time slot does not belong to this doctor.');
    }
    if (slot.isBooked) throw new BadRequestException('This time slot is already booked.');
    if (slot.startAt <= new Date()) {
      throw new BadRequestException('Appointments cannot be booked in the past.');
    }

    const clinicId = dto.clinicId ?? doctor.clinicId ?? undefined;
    if (dto.clinicId && doctor.clinicId && dto.clinicId !== doctor.clinicId) {
      throw new BadRequestException('Selected clinic does not match the doctor profile.');
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      const freshSlot = await tx.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
      if (!freshSlot || freshSlot.isBooked || !freshSlot.isActive) {
        throw new BadRequestException('This time slot is no longer available.');
      }

      const createdAppointment = await tx.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId: dto.doctorId,
          clinicId,
          timeSlotId: dto.timeSlotId,
          appointmentDate: freshSlot.slotDate,
          scheduledStartAt: freshSlot.startAt,
          scheduledEndAt: freshSlot.endAt,
          consultationType: dto.consultationType,
          reason: dto.reason,
          notes: dto.notes,
          paymentStatus: PaymentStatus.UNPAID,
        },
        include: {
          doctor: { include: { user: true } },
          clinic: true,
          timeSlot: true,
        },
      });

      await tx.doctorTimeSlot.update({
        where: { id: dto.timeSlotId },
        data: { isBooked: true },
      });

      return createdAppointment;
    });

    return {
      id: appointment.id,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.user.name,
      },
      clinic: appointment.clinic
        ? {
            id: appointment.clinic.id,
            name: appointment.clinic.name,
          }
        : null,
      timeSlot: appointment.timeSlot
        ? {
            slotId: appointment.timeSlot.id,
            startAt: appointment.timeSlot.startAt,
            endAt: appointment.timeSlot.endAt,
          }
        : null,
    };
  }

  async getAppointments(user: AuthUser, query: PatientAppointmentsQueryDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.AppointmentWhereInput = {
      patientId: patientProfile.id,
      status: query.status,
      ...(query.date
        ? {
            appointmentDate: {
              gte: this.startOfDay(query.date),
              lt: this.endOfDayExclusive(query.date),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        include: {
          doctor: { include: { user: true, specialty: true } },
          clinic: true,
          review: true,
        },
        orderBy: { scheduledStartAt: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((appointment) => this.mapAppointmentListItem(appointment)),
      total,
      query,
    );
  }

  async getAppointment(user: AuthUser, id: string) {
    const patientProfile = await this.getCurrentPatientProfile(user);

    const appointment = await this.prisma.appointment.findFirst({
      where: { id, patientId: patientProfile.id },
      include: {
        doctor: { include: { user: true, specialty: true, clinic: true } },
        clinic: true,
        payment: true,
        medicalRecords: {
          include: { doctor: { include: { user: true } } },
          orderBy: { recordDate: 'desc' },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
        },
        review: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    return {
      id: appointment.id,
      status: appointment.status,
      appointmentDate: this.formatDate(appointment.appointmentDate),
      scheduledStartAt: appointment.scheduledStartAt,
      scheduledEndAt: appointment.scheduledEndAt,
      consultationType: appointment.consultationType,
      reason: appointment.reason,
      notes: appointment.notes,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.user.name,
        specialty: appointment.doctor.specialty.name,
        clinic: appointment.doctor.clinic
          ? {
              id: appointment.doctor.clinic.id,
              name: appointment.doctor.clinic.name,
              address: appointment.doctor.clinic.address,
            }
          : null,
      },
      clinic: appointment.clinic
        ? {
            id: appointment.clinic.id,
            name: appointment.clinic.name,
            address: appointment.clinic.address,
          }
        : null,
      payment: appointment.payment
        ? {
            id: appointment.payment.id,
            amount: this.toNumber(appointment.payment.amount),
            currency: appointment.payment.currency,
            method: appointment.payment.method,
            status: appointment.payment.status,
            transactionRef: appointment.payment.transactionRef,
            paidAt: appointment.payment.paidAt,
          }
        : null,
      medicalRecords: appointment.medicalRecords.map((record) => ({
        id: record.id,
        title: record.title,
        description: record.description,
        fileUrl: record.fileUrl,
        recordDate: this.formatDate(record.recordDate),
        doctor: {
          id: record.doctor.id,
          name: record.doctor.user.name,
        },
        appointmentId: record.appointmentId,
      })),
      prescriptions: appointment.prescriptions.map((prescription) => ({
        id: prescription.id,
        diagnosis: prescription.diagnosis,
        medications: prescription.medications,
        instructions: prescription.instructions,
        followUpDate: prescription.followUpDate,
        createdAt: prescription.createdAt,
      })),
      review: appointment.review
        ? {
            id: appointment.review.id,
            rating: appointment.review.rating,
            comment: appointment.review.comment,
            createdAt: appointment.review.createdAt,
          }
        : null,
    };
  }

  async cancelAppointment(user: AuthUser, id: string, dto: CancelPatientAppointmentDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const appointment = await this.findPatientAppointmentOrThrow(patientProfile.id, id);

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be cancelled.');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled.');
    }

    const updatedAppointment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          rejectionReason: dto.reason,
          timeSlotId: null,
        },
      });

      if (appointment.timeSlotId) {
        await tx.doctorTimeSlot.update({
          where: { id: appointment.timeSlotId },
          data: { isBooked: false },
        });
      }

      return updated;
    });

    return {
      id: updatedAppointment.id,
      status: updatedAppointment.status,
    };
  }

  async rescheduleAppointment(user: AuthUser, id: string, dto: RescheduleAppointmentDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const appointment = await this.findPatientAppointmentOrThrow(patientProfile.id, id);

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException('This appointment cannot be rescheduled.');
    }

    const newSlot = await this.prisma.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
    if (!newSlot || newSlot.isBooked || !newSlot.isActive) {
      throw new BadRequestException('Selected time slot is not available.');
    }
    if (newSlot.startAt <= new Date()) {
      throw new BadRequestException('Appointments cannot be booked in the past.');
    }
    if (newSlot.doctorId !== appointment.doctorId) {
      throw new BadRequestException('New slot must belong to the same doctor.');
    }

    const updatedAppointment = await this.prisma.$transaction(async (tx) => {
      if (appointment.timeSlotId) {
        await tx.doctorTimeSlot.update({
          where: { id: appointment.timeSlotId },
          data: { isBooked: false },
        });
      }

      await tx.doctorTimeSlot.update({
        where: { id: dto.timeSlotId },
        data: { isBooked: true },
      });

      return tx.appointment.update({
        where: { id },
        data: {
          timeSlotId: dto.timeSlotId,
          appointmentDate: newSlot.slotDate,
          scheduledStartAt: newSlot.startAt,
          scheduledEndAt: newSlot.endAt,
          status: AppointmentStatus.RESCHEDULED,
          rescheduleReason: dto.reason,
        },
      });
    });

    return {
      id: updatedAppointment.id,
      status: updatedAppointment.status,
      timeSlotId: updatedAppointment.timeSlotId,
    };
  }

  async getMedicalRecords(user: AuthUser, query: PatientAppointmentsQueryDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const { skip, take } = buildPagination(query);

    const where = { patientId: patientProfile.id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take,
        include: {
          doctor: { include: { user: true } },
        },
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((record) => ({
        id: record.id,
        title: record.title,
        description: record.description,
        fileUrl: record.fileUrl,
        recordDate: this.formatDate(record.recordDate),
        doctor: {
          id: record.doctor.id,
          name: record.doctor.user.name,
        },
        appointmentId: record.appointmentId,
      })),
      total,
      query,
    );
  }

  async getMedicalRecord(user: AuthUser, id: string) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id, patientId: patientProfile.id },
      include: {
        doctor: { include: { user: true } },
      },
    });
    if (!record) throw new NotFoundException('Medical record not found.');

    return {
      id: record.id,
      title: record.title,
      description: record.description,
      fileUrl: record.fileUrl,
      recordDate: this.formatDate(record.recordDate),
      doctor: {
        id: record.doctor.id,
        name: record.doctor.user.name,
      },
      appointmentId: record.appointmentId,
    };
  }

  async getReviews(user: AuthUser, query: PatientAppointmentsQueryDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const { skip, take } = buildPagination(query);

    const where = { patientId: patientProfile.id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          doctor: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((review) => ({
        id: review.id,
        appointmentId: review.appointmentId,
        doctor: {
          id: review.doctor.id,
          name: review.doctor.user.name,
        },
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
      total,
      query,
    );
  }

  async createReview(user: AuthUser, dto: CreateReviewDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (appointment.patientId !== patientProfile.id) {
      throw new ForbiddenException('Patients can only review their own appointments.');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Only completed appointments can be reviewed.');
    }

    const review = await this.prisma.review.create({
      data: {
        appointmentId: dto.appointmentId,
        doctorId: appointment.doctorId,
        patientId: patientProfile.id,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.refreshDoctorRating(appointment.doctorId);
    return review;
  }

  async updateReview(user: AuthUser, id: string, dto: UpdateReviewDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.patientId !== patientProfile.id) {
      throw new NotFoundException('Review not found.');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.refreshDoctorRating(review.doctorId);
    return updatedReview;
  }

  async removeReview(user: AuthUser, id: string) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.patientId !== patientProfile.id) {
      throw new NotFoundException('Review not found.');
    }

    await this.prisma.review.delete({ where: { id } });
    await this.refreshDoctorRating(review.doctorId);
    return { message: 'Review deleted successfully.' };
  }

  async getNotifications(user: AuthUser, query: PatientNotificationsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where: Prisma.NotificationWhereInput = {
      userId: user.sub,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((notification) => this.mapNotificationItem(notification)),
      total,
      query,
    );
  }

  async readNotification(user: AuthUser, id: string, dto: MarkNotificationReadDto) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: user.sub },
    });
    if (!notification) throw new NotFoundException('Notification not found.');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: dto.isRead ?? true },
    });
  }

  async readAllNotifications(user: AuthUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.sub, isRead: false },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  async getPayments(user: AuthUser, query: PatientPaymentsQueryDto) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const { skip, take } = buildPagination(query);

    const where = {
      patientId: patientProfile.id,
      status: query.status,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((payment) => this.mapPaymentItem(payment)),
      total,
      query,
    );
  }

  async getPayment(user: AuthUser, id: string) {
    const patientProfile = await this.getCurrentPatientProfile(user);
    const payment = await this.prisma.payment.findFirst({
      where: { id, patientId: patientProfile.id },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    return this.mapPaymentItem(payment);
  }

  private async getCurrentPatientProfile(user: AuthUser) {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can access this resource.');
    }

    const patientProfile = await this.prisma.patientProfile.findFirst({
      where: { userId: user.sub },
      include: { user: true },
    });
    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found for current user.');
    }

    return patientProfile;
  }

  private async ensureDoctorExists(doctorId: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');
    return doctor;
  }

  private async findPatientAppointmentOrThrow(patientId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patientId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    return appointment;
  }

  private mapPatientProfileResponse(patientProfile: {
    id: string;
    dateOfBirth: Date | null;
    gender: string | null;
    bloodGroup: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      location: string | null;
      avatarUrl: string | null;
    };
  }) {
    return {
      user: {
        id: patientProfile.user.id,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        phone: patientProfile.user.phone,
        location: patientProfile.user.location,
        avatarUrl: patientProfile.user.avatarUrl,
      },
      patientProfile: {
        id: patientProfile.id,
        dateOfBirth: patientProfile.dateOfBirth ? this.formatDate(patientProfile.dateOfBirth) : null,
        gender: patientProfile.gender,
        bloodGroup: patientProfile.bloodGroup,
        address: patientProfile.address,
        emergencyContactName: patientProfile.emergencyContactName,
        emergencyContactPhone: patientProfile.emergencyContactPhone,
      },
    };
  }

  private mapDoctorListItem(doctor: {
    id: string;
    experienceYears: number;
    consultationFee: Prisma.Decimal;
    ratingAverage: Prisma.Decimal;
    about: string | null;
    isVerified: boolean;
    user: { name: string };
    specialty: { name: string };
    clinic: { name: string } | null;
  }) {
    return {
      doctorId: doctor.id,
      name: doctor.user.name,
      specialty: doctor.specialty.name,
      clinic: doctor.clinic?.name ?? null,
      experienceYears: doctor.experienceYears,
      consultationFee: this.toNumber(doctor.consultationFee),
      rating: this.toNumber(doctor.ratingAverage),
      about: doctor.about,
      isVerified: doctor.isVerified,
    };
  }

  private mapDashboardAppointment(appointment: {
    id: string;
    appointmentDate: Date;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    status: AppointmentStatus;
    consultationType: string;
    reason: string;
    paymentStatus: PaymentStatus;
    doctor: {
      id: string;
      user: { name: string };
      specialty: { name: string };
      clinic: { name: string } | null;
    };
    clinic: { name: string } | null;
  }) {
    return {
      id: appointment.id,
      doctorId: appointment.doctor.id,
      doctorName: appointment.doctor.user.name,
      specialty: appointment.doctor.specialty.name,
      clinic: appointment.clinic?.name ?? appointment.doctor.clinic?.name ?? null,
      appointmentDate: this.formatDate(appointment.appointmentDate),
      scheduledStartAt: appointment.scheduledStartAt,
      scheduledEndAt: appointment.scheduledEndAt,
      status: appointment.status,
      consultationType: appointment.consultationType,
      reason: appointment.reason,
      paymentStatus: appointment.paymentStatus,
    };
  }

  private mapAppointmentListItem(appointment: {
    id: string;
    status: AppointmentStatus;
    appointmentDate: Date;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    consultationType: string;
    reason: string;
    notes: string | null;
    paymentStatus: PaymentStatus;
    doctor: {
      id: string;
      user: { name: string };
      specialty: { name: string };
    };
    clinic: { id: string; name: string } | null;
    review: { id: string } | null;
  }) {
    const now = new Date();
    const canManage =
      this.activeAppointmentStatuses.includes(appointment.status) &&
      appointment.scheduledStartAt > now;

    return {
      id: appointment.id,
      status: appointment.status,
      appointmentDate: this.formatDate(appointment.appointmentDate),
      scheduledStartAt: appointment.scheduledStartAt,
      scheduledEndAt: appointment.scheduledEndAt,
      consultationType: appointment.consultationType,
      reason: appointment.reason,
      notes: appointment.notes,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.user.name,
        specialty: appointment.doctor.specialty.name,
      },
      clinic: appointment.clinic
        ? {
            id: appointment.clinic.id,
            name: appointment.clinic.name,
          }
        : null,
      paymentStatus: appointment.paymentStatus,
      canCancel: canManage,
      canReschedule: canManage,
      canReview: appointment.status === AppointmentStatus.COMPLETED && !appointment.review,
    };
  }

  private mapNotificationItem(notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
  }) {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }

  private mapPaymentItem(payment: {
    id: string;
    appointmentId: string;
    amount: Prisma.Decimal;
    currency: string;
    method: string;
    status: PaymentStatus;
    transactionRef: string | null;
    paidAt: Date | null;
  }) {
    return {
      id: payment.id,
      appointmentId: payment.appointmentId,
      amount: this.toNumber(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      transactionRef: payment.transactionRef,
      paidAt: payment.paidAt,
    };
  }

  private async refreshDoctorRating(doctorId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        reviewsCount: aggregate._count.rating,
      },
    });
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) return null;
    return Number(value);
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private startOfDay(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private endOfDayExclusive(value: string) {
    const start = this.startOfDay(value);
    start.setUTCDate(start.getUTCDate() + 1);
    return start;
  }

  private readonly activeAppointmentStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULED,
  ];
}
