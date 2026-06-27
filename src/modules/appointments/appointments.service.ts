import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AppointmentsQueryDto,
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointments.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, user: AuthUser) {
    if (user.role !== UserRole.PATIENT && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only patients or admins can create appointments.');
    }

    const slot = await this.prisma.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
    if (!slot || !slot.isActive) throw new NotFoundException('Time slot not found.');
    if (slot.doctorId !== dto.doctorId) throw new BadRequestException('Slot does not belong to the selected doctor.');
    if (slot.isBooked) throw new BadRequestException('This slot is already booked.');
    if (slot.startAt <= new Date()) throw new BadRequestException('Appointments cannot be booked in the past.');

    const patientProfile = await this.prisma.patientProfile.findFirst({
      where: user.role === UserRole.ADMIN ? undefined : { userId: user.sub },
    });
    if (!patientProfile) throw new NotFoundException('Patient profile not found for current user.');

    return this.prisma.$transaction(async (tx) => {
      const freshSlot = await tx.doctorTimeSlot.findUnique({ where: { id: dto.timeSlotId } });
      if (!freshSlot || freshSlot.isBooked) {
        throw new BadRequestException('This slot is already booked.');
      }

      const appointment = await tx.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
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
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true, clinic: true } },
          timeSlot: true,
        },
      });

      await tx.doctorTimeSlot.update({
        where: { id: dto.timeSlotId },
        data: { isBooked: true },
      });

      return appointment;
    });
  }

  async findAll(query: AppointmentsQueryDto, user: AuthUser) {
    const { skip, take } = buildPagination(query);
    const patientProfile = user.role === UserRole.PATIENT
      ? await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } })
      : null;
    const doctorProfile = user.role === UserRole.DOCTOR
      ? await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } })
      : null;

    const where: Prisma.AppointmentWhereInput = {
      status: query.status,
      doctorId: query.doctorId,
      patientId: query.patientId,
      ...(query.date ? { appointmentDate: new Date(query.date) } : {}),
      ...(query.search
        ? {
            OR: [
              { reason: { contains: query.search, mode: 'insensitive' } },
              { patient: { user: { name: { contains: query.search, mode: 'insensitive' } } } },
              { doctor: { user: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    if (user.role === UserRole.PATIENT) {
      where.patientId = patientProfile?.id;
    }
    if (user.role === UserRole.DOCTOR) {
      where.doctorId = doctorProfile?.id;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true, clinic: true } },
          clinic: true,
          timeSlot: true,
          payment: true,
          review: true,
        },
        orderBy: { scheduledStartAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string, user: AuthUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true, clinic: true } },
        clinic: true,
        timeSlot: true,
        payment: true,
        review: true,
        medicalRecords: true,
        prescriptions: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    await this.assertAppointmentAccess(appointment, user);
    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto, user: AuthUser) {
    const appointment = await this.findOne(id, user);
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be modified.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: dto,
    });
  }

  async changeStatus(id: string, dto: ChangeAppointmentStatusDto, user: AuthUser) {
    const appointment = await this.findOne(id, user);

    if (dto.status === AppointmentStatus.CANCELLED) {
      return this.cancel(id, user, dto.reason);
    }

    if (dto.status === AppointmentStatus.COMPLETED) {
      return this.complete(id, user);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === AppointmentStatus.REJECTED ? dto.reason : undefined,
      },
    });
  }

  async cancel(id: string, user: AuthUser, reason?: string) {
    const appointment = await this.findOne(id, user);

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be cancelled.');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          rejectionReason: reason,
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
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, user: AuthUser) {
    const appointment = await this.findOne(id, user);
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

    return this.prisma.$transaction(async (tx) => {
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
  }

  async complete(id: string, user: AuthUser) {
    const appointment = await this.findOne(id, user);
    if (user.role === UserRole.PATIENT) {
      throw new ForbiddenException('Patients cannot mark appointments as completed.');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED, completedAt: new Date() },
    });
  }

  private async assertAppointmentAccess(appointment: { patientId: string; doctorId: string }, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.PATIENT) {
      const patientProfile = await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } });
      if (!patientProfile || patientProfile.id !== appointment.patientId) {
        throw new ForbiddenException('Patients can only manage their own appointments.');
      }
      return;
    }

    if (user.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } });
      if (!doctorProfile || doctorProfile.id !== appointment.doctorId) {
        throw new ForbiddenException('Doctors can only manage their own appointments.');
      }
      return;
    }

    throw new ForbiddenException('You do not have access to this appointment.');
  }
}
