import type { UserProfile } from "@fluyo/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import type { UpdateCurrentProfileDto } from "./dto/update-current-profile.dto";

interface ProfileRow {
  id: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(identityId: string): Promise<UserProfile | null> {
    const profile = await this.prisma.userProfile.findFirst({
      where: { deletedAt: null, id: identityId },
    });

    return profile ? toProfile(profile) : null;
  }

  async updateCurrent(identityId: string, input: UpdateCurrentProfileDto): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.upsert({
      where: { id: identityId },
      create: { id: identityId, displayName: input.displayName },
      update: { displayName: input.displayName, deletedAt: null },
    });

    return toProfile(profile);
  }
}
