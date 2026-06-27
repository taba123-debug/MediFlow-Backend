import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsQueryDto, UpdatePatientProfileDto } from './dto/patients.dto';

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
}
