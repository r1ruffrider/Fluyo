import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import type {
  ActivityAttemptReplayStore,
  StoredActivityAttemptReplay,
} from "./activity-attempt-admission.service";

@Injectable()
export class PrismaActivityAttemptReplayStore implements ActivityAttemptReplayStore {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwnerAndKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<StoredActivityAttemptReplay | null> {
    return this.prisma.activityAttempt.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: { requestHash: true, response: true },
    });
  }
}
