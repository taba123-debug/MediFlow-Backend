import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { DoctorsQueryDto, UpdateDoctorProfileDto } from './dto/doctors.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DoctorsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where: Prisma.DoctorProfileWhereInput = {
      specialtyId: query.specialtyId,
      clinicId: query.clinicId,
      ...(query.minFee || query.maxFee
        ? {
            consultationFee: {
              ...(query.minFee ? { gte: new Prisma.Decimal(query.minFee) } : {}),
              ...(query.maxFee ? { lte: new Prisma.Decimal(query.maxFee) } : {}),
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
}
