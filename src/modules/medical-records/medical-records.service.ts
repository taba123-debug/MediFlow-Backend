import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicalRecordDto, MedicalRecordsQueryDto, UpdateMedicalRecordDto } from './dto/medical-records.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicalRecordDto, user: AuthUser) {
    await this.assertDoctorOrAdmin(dto.doctorId, user);
    return this.prisma.medicalRecord.create({
      data: {
        ...dto,
        recordDate: new Date(dto.recordDate),
      },
    });
  }

  async findAll(query: MedicalRecordsQueryDto, user: AuthUser) {
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
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          appointment: true,
        },
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string, user: AuthUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        appointment: true,
      },
    });
    if (!record) throw new NotFoundException('Medical record not found.');
    await this.assertRecordAccess(record.patient.userId, record.doctor.userId, user);
    return record;
  }

  async update(id: string, dto: UpdateMedicalRecordDto, user: AuthUser) {
    const record = await this.findOne(id, user);
    await this.assertDoctorOrAdmin(record.doctorId, user);
    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        ...dto,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    const record = await this.findOne(id, user);
    await this.assertDoctorOrAdmin(record.doctorId, user);
    return this.prisma.medicalRecord.delete({ where: { id } });
  }

  private async assertDoctorOrAdmin(doctorId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    const doctorProfile = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctorProfile || user.role !== UserRole.DOCTOR || doctorProfile.userId !== user.sub) {
      throw new ForbiddenException('Only the assigned doctor or admin can manage this medical record.');
    }
  }

  private async assertRecordAccess(patientUserId: string, doctorUserId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.PATIENT && patientUserId === user.sub) return;
    if (user.role === UserRole.DOCTOR && doctorUserId === user.sub) return;
    throw new ForbiddenException('You do not have access to this medical record.');
  }
}
