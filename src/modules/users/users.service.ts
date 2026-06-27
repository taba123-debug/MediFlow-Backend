import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { UpdateUserDto, UpdateUserStatusDto, UsersQueryDto } from './dto/users.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = {
      role: query.role,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        include: { patientProfile: true, doctorProfile: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string, user: AuthUser) {
    if (user.role !== UserRole.ADMIN && user.sub !== id) {
      throw new ForbiddenException('You can only view your own user profile.');
    }

    const found = await this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: true,
        doctorProfile: { include: { specialty: true, clinic: true } },
      },
    });
    if (!found) throw new NotFoundException('User not found.');
    return found;
  }

  async update(id: string, dto: UpdateUserDto, user: AuthUser) {
    if (user.role !== UserRole.ADMIN && user.sub !== id) {
      throw new ForbiddenException('You can only update your own profile.');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: {
        patientProfile: true,
        doctorProfile: { include: { specialty: true, clinic: true } },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
