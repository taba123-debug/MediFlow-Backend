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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
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
  DoctorsQueryDto,
  DoctorSlotsQueryDto,
  DoctorUpdateMedicalRecordDto,
  DoctorUpdatePrescriptionDto,
  UpdateDoctorProfileDto,
} from './dto/doctors.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DoctorsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where: Prisma.DoctorProfileWhereInput = {
      specialtyId: query.specialtyId,
      clinicId: query.clinicId,
      ...(query.minFee !== undefined || query.maxFee !== undefined
        ? {
            consultationFee: {
              ...(query.minFee !== undefined ? { gte: new Prisma.Decimal(query.minFee) } : {}),
              ...(query.maxFee !== undefined ? { lte: new Prisma.Decimal(query.maxFee) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { user: { name: { contains: query.search, mode: 'insensitive' } } },
              { specialty: { name: { contains: query.search, mode: 'insensitive' } } },
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: true,
        specialty: true,
        clinic: true,
        availabilities: true,
        timeSlots: {
          where: { isActive: true },
          orderBy: { startAt: 'asc' },
          take: 20,
        },
        reviews: {
          include: { patient: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorProfileDto, user: AuthUser) {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    if (user.role === UserRole.DOCTOR && doctor.userId !== user.sub) {
      throw new ForbiddenException('Doctors can only update their own profile.');
    }

    return this.prisma.doctorProfile.update({
      where: { id },
      data: {
        specialtyId: dto.specialtyId,
        clinicId: dto.clinicId,
        licenseNumber: dto.licenseNumber,
        experienceYears: dto.experienceYears,
        consultationFee:
          dto.consultationFee !== undefined ? new Prisma.Decimal(dto.consultationFee) : undefined,
        about: dto.about,
        qualification: dto.qualification,
        isVerified: dto.isVerified,
      },
      include: {
        user: true,
        specialty: true,
        clinic: true,
      },
    });
  }

  async getDoctorDashboard(user: AuthUser) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const now = new Date();

    const [todayAppointments, upcomingAppointmentsCount, pendingReviewsCount, uniquePatientsRows] =
      await this.prisma.$transaction([
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            appointmentDate: {
              gte: this.startOfDayFromDate(now),
              lt: this.endOfDayExclusiveFromDate(now),
            },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            scheduledStartAt: { gte: now },
            status: { in: this.activeAppointmentStatuses },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            status: AppointmentStatus.COMPLETED,
            review: {
              is: null,
            },
          },
        }),
        this.prisma.appointment.findMany({
          where: { doctorId: doctor.id },
          distinct: ['patientId'],
          select: { patientId: true },
        }),
      ]);
    const uniquePatientsCount = uniquePatientsRows.length;

    const [upcomingAppointments, recentPatients, recentPayments] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          scheduledStartAt: { gte: now },
          status: { in: this.activeAppointmentStatuses },
        },
        include: {
          patient: { include: { user: true } },
          clinic: true,
        },
        orderBy: { scheduledStartAt: 'asc' },
        take: 5,
      }),
      this.prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        include: {
          patient: { include: { user: true } },
        },
        distinct: ['patientId'],
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.payment.findMany({
        where: { doctorId: doctor.id },
        include: { appointment: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const earnings = await this.getDoctorEarnings(user, {});

    return {
      profile: {
        userId: doctor.user.id,
        doctorId: doctor.id,
        name: doctor.user.name,
        email: doctor.user.email,
        specialty: doctor.specialty.name,
        clinic: doctor.clinic?.name ?? null,
      },
      stats: {
        todayAppointments,
        upcomingAppointments: upcomingAppointmentsCount,
        totalPatients: uniquePatientsCount,
        pendingReviews: pendingReviewsCount,
        totalEarnings: earnings.summary.totalEarnings,
      },
      upcomingAppointments: upcomingAppointments.map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patient.id,
        patientName: appointment.patient.user.name,
        appointmentDate: this.formatDate(appointment.appointmentDate),
        scheduledStartAt: appointment.scheduledStartAt,
        scheduledEndAt: appointment.scheduledEndAt,
        status: appointment.status,
        consultationType: appointment.consultationType,
        reason: appointment.reason,
        clinic: appointment.clinic?.name ?? null,
      })),
      recentPatients: recentPatients.map((appointment) => ({
        patientId: appointment.patient.id,
        name: appointment.patient.user.name,
        email: appointment.patient.user.email,
        lastAppointmentAt: appointment.createdAt,
      })),
      paymentsPreview: recentPayments.map((payment) => this.mapDoctorPayment(payment)),
    };
  }

  async getDoctorProfile(user: AuthUser) {
    const doctor = await this.getCurrentDoctorProfile(user);
    return this.mapDoctorProfileResponse(doctor);
  }

  async updateDoctorProfile(user: AuthUser, dto: DoctorProfileUpdateDto) {
    const doctor = await this.getCurrentDoctorProfile(user);

    if (dto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } });
      if (!specialty) throw new NotFoundException('Specialty not found.');
    }

    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
      if (!clinic) throw new NotFoundException('Clinic not found.');
    }

    const [updatedUser, updatedDoctor] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: doctor.userId },
        data: {
          name: dto.name,
          phone: dto.phone,
          location: dto.location,
          avatarUrl: dto.avatarUrl,
        },
      }),
      this.prisma.doctorProfile.update({
        where: { id: doctor.id },
        data: {
          specialtyId: dto.specialtyId,
          clinicId: dto.clinicId,
          licenseNumber: dto.licenseNumber,
          experienceYears: dto.experienceYears,
          consultationFee:
            dto.consultationFee !== undefined ? new Prisma.Decimal(dto.consultationFee) : undefined,
          about: dto.about,
          qualification: dto.qualification,
        },
        include: {
          specialty: true,
          clinic: true,
        },
      }),
    ]);

    return this.mapDoctorProfileResponse({
      ...updatedDoctor,
      user: updatedUser,
    });
  }

  async getDoctorAvailability(user: AuthUser, query: PaginationQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorAvailability.findMany({
        where: { doctorId: doctor.id },
        skip,
        take,
        orderBy: [{ dayOfWeek: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.doctorAvailability.count({ where: { doctorId: doctor.id } }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async createDoctorAvailability(user: AuthUser, dto: CreateAvailabilityDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    return this.prisma.doctorAvailability.create({
      data: {
        doctorId: doctor.id,
        ...dto,
      },
    });
  }

  async updateDoctorAvailability(user: AuthUser, id: string, dto: UpdateAvailabilityDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const availability = await this.prisma.doctorAvailability.findUnique({ where: { id } });
    if (!availability || availability.doctorId !== doctor.id) {
      throw new NotFoundException('Availability not found.');
    }

    return this.prisma.doctorAvailability.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDoctorAvailability(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const availability = await this.prisma.doctorAvailability.findUnique({ where: { id } });
    if (!availability || availability.doctorId !== doctor.id) {
      throw new NotFoundException('Availability not found.');
    }

    return this.prisma.doctorAvailability.delete({ where: { id } });
  }

  async getDoctorSlots(user: AuthUser, query: DoctorSlotsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.DoctorTimeSlotWhereInput = {
      doctorId: doctor.id,
      ...(query.date
        ? {
            slotDate: {
              gte: this.startOfDay(query.date),
              lt: this.endOfDayExclusive(query.date),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorTimeSlot.findMany({
        where,
        skip,
        take,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.doctorTimeSlot.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async createDoctorSlot(user: AuthUser, dto: DoctorCreateTimeSlotDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    if (!dto.slotDate || !dto.startAt || !dto.endAt) {
      throw new BadRequestException('slotDate, startAt, and endAt are required.');
    }

    if (dto.availabilityId) {
      const availability = await this.prisma.doctorAvailability.findUnique({
        where: { id: dto.availabilityId },
      });
      if (!availability || availability.doctorId !== doctor.id) {
        throw new NotFoundException('Availability not found.');
      }
    }

    return this.prisma.doctorTimeSlot.create({
      data: {
        doctorId: doctor.id,
        availabilityId: dto.availabilityId,
        slotDate: new Date(dto.slotDate),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  async deleteDoctorSlot(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const slot = await this.prisma.doctorTimeSlot.findUnique({ where: { id } });
    if (!slot || slot.doctorId !== doctor.id) {
      throw new NotFoundException('Time slot not found.');
    }
    if (slot.isBooked) {
      throw new ForbiddenException('Booked slots cannot be deleted.');
    }

    return this.prisma.doctorTimeSlot.delete({ where: { id } });
  }

  async getDoctorAppointments(user: AuthUser, query: DoctorAppointmentsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.AppointmentWhereInput = {
      doctorId: doctor.id,
      status: query.status,
      patientId: query.patientId,
      ...(query.date
        ? {
            appointmentDate: {
              gte: this.startOfDay(query.date),
              lt: this.endOfDayExclusive(query.date),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reason: { contains: query.search, mode: 'insensitive' } },
              { patient: { user: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          clinic: true,
          payment: true,
          review: true,
        },
        orderBy: { scheduledStartAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        appointmentDate: this.formatDate(appointment.appointmentDate),
        scheduledStartAt: appointment.scheduledStartAt,
        scheduledEndAt: appointment.scheduledEndAt,
        consultationType: appointment.consultationType,
        reason: appointment.reason,
        notes: appointment.notes,
        patient: {
          id: appointment.patient.id,
          name: appointment.patient.user.name,
          email: appointment.patient.user.email,
        },
        clinic: appointment.clinic
          ? {
              id: appointment.clinic.id,
              name: appointment.clinic.name,
            }
          : null,
        paymentStatus: appointment.paymentStatus,
        hasPayment: Boolean(appointment.payment),
        hasReview: Boolean(appointment.review),
      })),
      total,
      query,
    );
  }

  async getDoctorAppointment(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, doctorId: doctor.id },
      include: {
        patient: { include: { user: true } },
        clinic: true,
        payment: true,
        review: true,
        medicalRecords: true,
        prescriptions: true,
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
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.user.name,
        email: appointment.patient.user.email,
        phone: appointment.patient.user.phone,
      },
      clinic: appointment.clinic,
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
      medicalRecords: appointment.medicalRecords,
      prescriptions: appointment.prescriptions,
      review: appointment.review,
    };
  }

  async changeDoctorAppointmentStatus(user: AuthUser, id: string, dto: ChangeAppointmentStatusDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    if (dto.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Doctors cannot cancel appointments using this endpoint.');
    }

    if (dto.status === AppointmentStatus.COMPLETED) {
      return this.prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.COMPLETED, completedAt: new Date() },
      });
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === AppointmentStatus.REJECTED ? dto.reason : undefined,
      },
    });
  }

  async rescheduleDoctorAppointment(user: AuthUser, id: string, dto: RescheduleAppointmentDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException('This appointment cannot be rescheduled.');
    }

    const newSlot = await this.prisma.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
    if (!newSlot || newSlot.doctorId !== doctor.id || newSlot.isBooked || !newSlot.isActive) {
      throw new BadRequestException('Selected time slot is not available.');
    }
    if (newSlot.startAt <= new Date()) {
      throw new BadRequestException('Appointments cannot be booked in the past.');
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

  async getDoctorPatients(user: AuthUser, query: DoctorPatientsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.search
          ? {
              patient: {
                user: {
                  OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                  ],
                },
              },
            }
          : {}),
      },
      include: {
        patient: { include: { user: true } },
      },
      distinct: ['patientId'],
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.appointment
      .findMany({
        where: {
          doctorId: doctor.id,
          ...(query.patientId ? { patientId: query.patientId } : {}),
          ...(query.search
            ? {
                patient: {
                  user: {
                    OR: [
                      { name: { contains: query.search, mode: 'insensitive' } },
                      { email: { contains: query.search, mode: 'insensitive' } },
                    ],
                  },
                },
              }
            : {}),
        },
        distinct: ['patientId'],
        select: { patientId: true },
      })
      .then((rows) => rows.length);

    const data = await Promise.all(
      appointments.map(async (appointment) => {
        const [appointmentsCount, lastAppointment] = await this.prisma.$transaction([
          this.prisma.appointment.count({
            where: { doctorId: doctor.id, patientId: appointment.patientId },
          }),
          this.prisma.appointment.findFirst({
            where: { doctorId: doctor.id, patientId: appointment.patientId },
            orderBy: { scheduledStartAt: 'desc' },
          }),
        ]);

        return {
          patientId: appointment.patient.id,
          userId: appointment.patient.user.id,
          name: appointment.patient.user.name,
          email: appointment.patient.user.email,
          phone: appointment.patient.user.phone,
          gender: appointment.patient.gender,
          dateOfBirth: appointment.patient.dateOfBirth
            ? this.formatDate(appointment.patient.dateOfBirth)
            : null,
          totalAppointments: appointmentsCount,
          lastAppointmentAt: lastAppointment?.scheduledStartAt ?? null,
        };
      }),
    );

    return buildPaginatedResponse(data, total, query);
  }

  async getDoctorPatient(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const patient = await this.prisma.patientProfile.findFirst({
      where: {
        id,
        appointments: {
          some: { doctorId: doctor.id },
        },
      },
      include: { user: true },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    const [appointments, medicalRecords, prescriptions] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: { doctorId: doctor.id, patientId: patient.id },
        orderBy: { scheduledStartAt: 'desc' },
        take: 10,
      }),
      this.prisma.medicalRecord.findMany({
        where: { doctorId: doctor.id, patientId: patient.id },
        orderBy: { recordDate: 'desc' },
        take: 10,
      }),
      this.prisma.prescription.findMany({
        where: { doctorId: doctor.id, patientId: patient.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      patient: {
        id: patient.id,
        userId: patient.user.id,
        name: patient.user.name,
        email: patient.user.email,
        phone: patient.user.phone,
        location: patient.user.location,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : null,
        bloodGroup: patient.bloodGroup,
        address: patient.address,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
      },
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        appointmentDate: this.formatDate(appointment.appointmentDate),
        scheduledStartAt: appointment.scheduledStartAt,
        scheduledEndAt: appointment.scheduledEndAt,
        reason: appointment.reason,
      })),
      medicalRecords,
      prescriptions,
    };
  }

  async createDoctorMedicalRecord(user: AuthUser, dto: DoctorCreateMedicalRecordDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    await this.assertDoctorPatientAccess(doctor.id, dto.patientId, dto.appointmentId);

    return this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        doctorId: doctor.id,
        appointmentId: dto.appointmentId,
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        recordDate: new Date(dto.recordDate),
      },
    });
  }

  async getDoctorMedicalRecords(user: AuthUser, query: DoctorRecordsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.MedicalRecordWhereInput = {
      doctorId: doctor.id,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { patient: { user: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          appointment: true,
        },
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async getDoctorMedicalRecord(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id, doctorId: doctor.id },
      include: {
        patient: { include: { user: true } },
        appointment: true,
      },
    });
    if (!record) throw new NotFoundException('Medical record not found.');
    return record;
  }

  async updateDoctorMedicalRecord(user: AuthUser, id: string, dto: DoctorUpdateMedicalRecordDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id, doctorId: doctor.id },
    });
    if (!record) throw new NotFoundException('Medical record not found.');

    if (dto.patientId || dto.appointmentId) {
      await this.assertDoctorPatientAccess(
        doctor.id,
        dto.patientId ?? record.patientId,
        dto.appointmentId ?? record.appointmentId ?? undefined,
      );
    }

    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
      },
    });
  }

  async createDoctorPrescription(user: AuthUser, dto: DoctorCreatePrescriptionDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundException('Appointment not found.');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Prescription can only be created for completed appointments.');
    }

    return this.prisma.prescription.create({
      data: {
        appointmentId: appointment.id,
        doctorId: doctor.id,
        patientId: appointment.patientId,
        diagnosis: dto.diagnosis,
        medications: (dto.medications ?? []) as Prisma.InputJsonValue,
        instructions: dto.instructions,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async getDoctorPrescriptions(user: AuthUser, query: DoctorPrescriptionsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.PrescriptionWhereInput = {
      doctorId: doctor.id,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { diagnosis: { contains: query.search, mode: 'insensitive' } },
              { patient: { user: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          appointment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async getDoctorPrescription(user: AuthUser, id: string) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, doctorId: doctor.id },
      include: {
        patient: { include: { user: true } },
        appointment: true,
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found.');
    return prescription;
  }

  async updateDoctorPrescription(user: AuthUser, id: string, dto: DoctorUpdatePrescriptionDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, doctorId: doctor.id },
    });
    if (!prescription) throw new NotFoundException('Prescription not found.');

    if (dto.appointmentId && dto.appointmentId !== prescription.appointmentId) {
      throw new BadRequestException('Appointment cannot be changed for an existing prescription.');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        diagnosis: dto.diagnosis,
        medications: dto.medications as Prisma.InputJsonValue,
        instructions: dto.instructions,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async getDoctorEarnings(user: AuthUser, query: DoctorEarningsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const paidWhere: Prisma.PaymentWhereInput = {
      doctorId: doctor.id,
      status: PaymentStatus.PAID,
      ...(query.dateFrom || query.dateTo
        ? {
            paidAt: {
              ...(query.dateFrom ? { gte: this.startOfDay(query.dateFrom) } : {}),
              ...(query.dateTo ? { lt: this.endOfDayExclusive(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [aggregate, paymentsCount, recentPayments] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: paidWhere,
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: paidWhere }),
      this.prisma.payment.findMany({
        where: paidWhere,
        include: { appointment: true },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalEarnings: this.toNumber(aggregate._sum.amount) ?? 0,
        totalPaidPayments: paymentsCount,
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
      },
      recentPayments: recentPayments.map((payment) => this.mapDoctorPayment(payment)),
    };
  }

  async getDoctorPayments(user: AuthUser, query: DoctorPaymentsQueryDto) {
    const doctor = await this.getCurrentDoctorProfile(user);
    const { skip, take } = buildPagination(query);

    const where: Prisma.PaymentWhereInput = {
      doctorId: doctor.id,
      status: query.status,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          appointment: true,
          patient: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((payment) => this.mapDoctorPayment(payment)),
      total,
      query,
    );
  }

  private async getCurrentDoctorProfile(user: AuthUser) {
    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Only doctors can access this resource.');
    }

    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { userId: user.sub },
      include: {
        user: true,
        specialty: true,
        clinic: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found for current user.');
    return doctor;
  }

  private async assertDoctorPatientAccess(
    doctorId: string,
    patientId: string,
    appointmentId?: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        patientId,
        ...(appointmentId ? { id: appointmentId } : {}),
      },
    });
    if (!appointment) {
      throw new ForbiddenException('You do not have access to this patient record.');
    }
  }

  private mapDoctorProfileResponse(doctor: {
    id: string;
    userId: string;
    licenseNumber: string;
    experienceYears: number;
    consultationFee: Prisma.Decimal;
    about: string | null;
    qualification: string | null;
    isVerified: boolean;
    ratingAverage?: Prisma.Decimal;
    reviewsCount?: number;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      location: string | null;
      avatarUrl: string | null;
    };
    specialty: { id: string; name: string };
    clinic: { id: string; name: string; address: string } | null;
  }) {
    return {
      user: {
        id: doctor.user.id,
        name: doctor.user.name,
        email: doctor.user.email,
        phone: doctor.user.phone,
        location: doctor.user.location,
        avatarUrl: doctor.user.avatarUrl,
      },
      doctorProfile: {
        id: doctor.id,
        specialtyId: doctor.specialty.id,
        specialty: doctor.specialty.name,
        clinic: doctor.clinic
          ? {
              id: doctor.clinic.id,
              name: doctor.clinic.name,
              address: doctor.clinic.address,
            }
          : null,
        licenseNumber: doctor.licenseNumber,
        experienceYears: doctor.experienceYears,
        consultationFee: this.toNumber(doctor.consultationFee),
        qualification: doctor.qualification,
        about: doctor.about,
        isVerified: doctor.isVerified,
        rating: this.toNumber(doctor.ratingAverage),
        reviewsCount: doctor.reviewsCount ?? 0,
      },
    };
  }

  private mapDoctorPayment(payment: {
    id: string;
    appointmentId: string;
    amount: Prisma.Decimal;
    currency: string;
    method: string;
    status: PaymentStatus;
    transactionRef: string | null;
    paidAt: Date | null;
    appointment?: {
      scheduledStartAt: Date;
    } | null;
    patient?: {
      id: string;
      user: { name: string };
    } | null;
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
      appointmentAt: payment.appointment?.scheduledStartAt ?? null,
      patient: payment.patient
        ? {
            id: payment.patient.id,
            name: payment.patient.user.name,
          }
        : null,
    };
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

  private startOfDayFromDate(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private endOfDayExclusiveFromDate(date: Date) {
    const start = this.startOfDayFromDate(date);
    start.setUTCDate(start.getUTCDate() + 1);
    return start;
  }

  private readonly activeAppointmentStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULED,
  ];
}
