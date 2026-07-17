import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async isReachable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.warn("Database health check failed");
      return false;
    }
  }
}
