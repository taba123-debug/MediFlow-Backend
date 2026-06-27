import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { CreateSpecialtyDto, SpecialtiesQueryDto, UpdateSpecialtyDto } from './dto/specialties.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpecialtyDto) {
    return this.prisma.specialty.create({ data: dto });
  }

  async findAll(query: SpecialtiesQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.specialty.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.specialty.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: { doctors: true },
    });
    if (!specialty) throw new NotFoundException('Specialty not found.');
    return specialty;
  }

  async update(id: string, dto: UpdateSpecialtyDto) {
    await this.findOne(id);
    return this.prisma.specialty.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.specialty.delete({ where: { id } });
  }
}
