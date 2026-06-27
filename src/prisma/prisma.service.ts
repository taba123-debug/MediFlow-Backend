import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;

    super({
      adapter: new PrismaPg(connectionString ?? ''),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
