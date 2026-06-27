import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, ReviewsQueryDto, UpdateReviewDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, user: AuthUser) {
    const patientProfile = await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.PATIENT || !patientProfile) {
      throw new ForbiddenException('Only patients can create reviews.');
    }

    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (appointment.patientId !== patientProfile.id) {
      throw new ForbiddenException('Patients can only review their own appointments.');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Only completed appointments can be reviewed.');
    }

    const review = await this.prisma.review.create({
      data: {
        appointmentId: dto.appointmentId,
        doctorId: appointment.doctorId,
        patientId: patientProfile.id,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.refreshDoctorRating(appointment.doctorId);
    return review;
  }

  async findAll(query: ReviewsQueryDto) {
    const { skip, take } = buildPagination(query);
    const where = query.doctorId ? { doctorId: query.doctorId } : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          appointment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async update(id: string, dto: UpdateReviewDto, user: AuthUser) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found.');
    const patientProfile = await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.ADMIN && (!patientProfile || patientProfile.id !== review.patientId)) {
      throw new ForbiddenException('Only the reviewing patient or admin can update this review.');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.refreshDoctorRating(review.doctorId);
    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found.');
    const patientProfile = await this.prisma.patientProfile.findFirst({ where: { userId: user.sub } });
    if (user.role !== UserRole.ADMIN && (!patientProfile || patientProfile.id !== review.patientId)) {
      throw new ForbiddenException('Only the reviewing patient or admin can delete this review.');
    }

    await this.prisma.review.delete({ where: { id } });
    await this.refreshDoctorRating(review.doctorId);
    return { message: 'Review deleted successfully.' };
  }

  private async refreshDoctorRating(doctorId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        reviewsCount: aggregate._count.rating,
      },
    });
  }
}
