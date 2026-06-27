import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto, PrescriptionsQueryDto, UpdatePrescriptionDto } from './dto/prescriptions.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePrescriptionDto, user: AuthUser) {
    const doctorProfile = await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.DOCTOR || !doctorProfile) {
      throw new ForbiddenException('Only doctors can create prescriptions.');
    }

    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (appointment.doctorId !== doctorProfile.id) {
      throw new ForbiddenException('Doctors can only create prescriptions for their own appointments.');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Prescription can only be created for completed appointments.');
    }

    return this.prisma.prescription.create({
      data: {
        appointmentId: dto.appointmentId,
        doctorId: doctorProfile.id,
        patientId: dto.patientId,
        diagnosis: dto.diagnosis,
        medications: dto.medications as Prisma.InputJsonValue,
        instructions: dto.instructions,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async findAll(query: PrescriptionsQueryDto, user: AuthUser) {
    const { skip, take } = buildPagination(query);
    const patientProfile =
      user.role === UserRole.PATIENT
        ? await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } })
        : null;
    const doctorProfile =
      user.role === UserRole.DOCTOR
        ? await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } })
        : null;

    const where = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(user.role === UserRole.PATIENT ? { patientId: patientProfile?.id } : {}),
      ...(user.role === UserRole.DOCTOR ? { doctorId: doctorProfile?.id } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          appointment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async update(id: string, dto: UpdatePrescriptionDto, user: AuthUser) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found.');
    const doctorProfile = await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.ADMIN && (!doctorProfile || doctorProfile.id !== prescription.doctorId)) {
      throw new ForbiddenException('Only the prescribing doctor or admin can update this prescription.');
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

  async remove(id: string, user: AuthUser) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found.');
    const doctorProfile = await this.prisma.doctorProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.ADMIN && (!doctorProfile || doctorProfile.id !== prescription.doctorId)) {
      throw new ForbiddenException('Only the prescribing doctor or admin can delete this prescription.');
    }
    return this.prisma.prescription.delete({ where: { id } });
  }
}
