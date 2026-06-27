import { Injectable } from '@nestjs/common';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsQueryDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(query: ReportsQueryDto) {
    const where = {
      status: PaymentStatus.PAID,
      ...(query.from || query.to
        ? {
            paidAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const aggregate = await this.prisma.payment.aggregate({
      where,
      _sum: { amount: true, refundedAmount: true },
      _count: { id: true },
    });

    return aggregate;
  }

  async appointments(query: ReportsQueryDto) {
    const where = query.from || query.to
      ? {
          appointmentDate: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {};

    const [total, completed, cancelled, noShow] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.COMPLETED } }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.CANCELLED } }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.NO_SHOW } }),
    ]);

    return { total, completed, cancelled, noShow };
  }
}
