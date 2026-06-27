import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AvailabilityQueryDto,
  CreateAvailabilityDto,
  CreateTimeSlotDto,
  TimeSlotsQueryDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async createAvailability(doctorId: string, dto: CreateAvailabilityDto, user: AuthUser) {
    await this.assertDoctorAccess(doctorId, user);
    return this.prisma.doctorAvailability.create({
      data: {
        doctorId,
        ...dto,
      },
    });
  }

  async findAvailabilities(query: AvailabilityQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = query.doctorId ? { doctorId: query.doctorId } : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorAvailability.findMany({
        where,
        skip,
        take,
        orderBy: [{ doctorId: 'asc' }, { dayOfWeek: 'asc' }],
      }),
      this.prisma.doctorAvailability.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async updateAvailability(id: string, dto: UpdateAvailabilityDto, user: AuthUser) {
    const availability = await this.prisma.doctorAvailability.findUnique({ where: { id } });
    if (!availability) throw new NotFoundException('Availability not found.');
    await this.assertDoctorAccess(availability.doctorId, user);

    return this.prisma.doctorAvailability.update({
      where: { id },
      data: dto,
    });
  }

  async removeAvailability(id: string, user: AuthUser) {
    const availability = await this.prisma.doctorAvailability.findUnique({ where: { id } });
    if (!availability) throw new NotFoundException('Availability not found.');
    await this.assertDoctorAccess(availability.doctorId, user);

    return this.prisma.doctorAvailability.delete({ where: { id } });
  }

  async createTimeSlot(dto: CreateTimeSlotDto, user: AuthUser) {
    await this.assertDoctorAccess(dto.doctorId, user);

    return this.prisma.doctorTimeSlot.create({
      data: {
        doctorId: dto.doctorId,
        availabilityId: dto.availabilityId,
        slotDate: new Date(dto.slotDate),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  async findTimeSlots(query: TimeSlotsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = {
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.date ? { slotDate: new Date(query.date) } : {}),
      ...(query.search ? {} : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorTimeSlot.findMany({
        where,
        skip,
        take,
        include: { doctor: { include: { user: true, specialty: true, clinic: true } } },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.doctorTimeSlot.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async removeTimeSlot(id: string, user: AuthUser) {
    const slot = await this.prisma.doctorTimeSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Time slot not found.');
    await this.assertDoctorAccess(slot.doctorId, user);

    if (slot.isBooked) {
      throw new ForbiddenException('Booked slots cannot be deleted.');
    }

    return this.prisma.doctorTimeSlot.delete({ where: { id } });
  }

  private async assertDoctorAccess(doctorId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;

    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    if (user.role !== UserRole.DOCTOR || doctor.userId !== user.sub) {
      throw new ForbiddenException('You can only manage your own availability.');
    }
  }
}
