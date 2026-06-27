import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { ClinicsQueryDto, CreateClinicDto, UpdateClinicDto } from './dto/clinics.dto';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClinicDto) {
    return this.prisma.clinic.create({ data: dto });
  }

  async findAll(query: ClinicsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = {
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' as const } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { city: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.clinic.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { doctors: true },
    });
    if (!clinic) throw new NotFoundException('Clinic not found.');
    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto) {
    await this.findOne(id);
    return this.prisma.clinic.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.clinic.delete({ where: { id } });
  }
}
