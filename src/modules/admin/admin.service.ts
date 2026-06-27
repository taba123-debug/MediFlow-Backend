import { Injectable } from '@nestjs/common';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      usersCount,
      doctorsCount,
      patientsCount,
      appointmentsCount,
      pendingAppointments,
      completedAppointments,
      paidPayments,
      unreadNotifications,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.doctorProfile.count(),
      this.prisma.patientProfile.count(),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: AppointmentStatus.PENDING } }),
      this.prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      usersCount,
      doctorsCount,
      patientsCount,
      appointmentsCount,
      pendingAppointments,
      completedAppointments,
      paidPayments,
      unreadNotifications,
    };
  }
}
