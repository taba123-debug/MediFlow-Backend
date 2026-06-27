import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, PaymentsQueryDto, UpdatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          appointmentId: dto.appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency ?? 'USD',
          method: dto.method,
          status: dto.status ?? PaymentStatus.UNPAID,
          transactionRef: dto.transactionRef,
          paidAt: dto.status === PaymentStatus.PAID ? new Date() : undefined,
        },
      });

      await tx.appointment.update({
        where: { id: dto.appointmentId },
        data: { paymentStatus: payment.status },
      });

      return payment;
    });
  }

  async findAll(query: PaymentsQueryDto, user: AuthUser) {
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
      status: query.status,
      ...(user.role === UserRole.PATIENT ? { patientId: patientProfile?.id } : {}),
      ...(user.role === UserRole.DOCTOR ? { doctorId: doctorProfile?.id } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          appointment: true,
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findOne(id: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: true,
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    if (
      user.role !== UserRole.ADMIN &&
      payment.patient.userId !== user.sub &&
      payment.doctor.userId !== user.sub
    ) {
      throw new ForbiddenException('You do not have access to this payment.');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment not found.');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
          currency: dto.currency,
          method: dto.method,
          status: dto.status,
          transactionRef: dto.transactionRef,
          refundedAmount:
            dto.refundedAmount !== undefined ? new Prisma.Decimal(dto.refundedAmount) : undefined,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : dto.status === PaymentStatus.PAID ? new Date() : undefined,
        },
      });

      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: { paymentStatus: payment.status },
      });

      return payment;
    });
  }
}
