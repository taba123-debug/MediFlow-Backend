import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerPatient(dto: RegisterPatientDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        location: dto.location,
        role: UserRole.PATIENT,
        status: 'ACTIVE',
        patientProfile: {
          create: {
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            gender: dto.gender,
            bloodGroup: dto.bloodGroup,
            address: dto.address,
            emergencyContactName: dto.emergencyContactName,
            emergencyContactPhone: dto.emergencyContactPhone,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async registerDoctor(dto: RegisterDoctorDto) {
    const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } });
    if (!specialty) throw new NotFoundException('Specialty not found.');

    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
      if (!clinic) throw new NotFoundException('Clinic not found.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        location: dto.location,
        role: UserRole.DOCTOR,
        status: 'ACTIVE',
        doctorProfile: {
          create: {
            specialtyId: dto.specialtyId,
            clinicId: dto.clinicId,
            licenseNumber: dto.licenseNumber,
            experienceYears: dto.experienceYears,
            consultationFee: new Prisma.Decimal(dto.consultationFee),
            qualification: dto.qualification,
            about: dto.about,
            isVerified: dto.isVerified ?? false,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { patientProfile: true, doctorProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; role: UserRole }>(
      refreshToken,
      { secret: this.configService.get<string>('auth.refreshSecret') },
    );
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logged out successfully.' };
  }

  async me(user: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        patientProfile: true,
        doctorProfile: {
          include: {
            specialty: true,
            clinic: true,
          },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('auth.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>('auth.accessExpiresIn') as never,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>('auth.refreshExpiresIn') as never,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });

    return {
      accessToken,
      refreshToken,
      user: await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          patientProfile: true,
          doctorProfile: true,
        },
      }),
    };
  }
}
