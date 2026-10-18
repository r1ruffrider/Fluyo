import type {
  LearningGoal,
  LearningPreference,
  LearningStreak,
  NotificationPreference,
} from "@fluyo/shared";
import { BadRequestException, Injectable, Optional } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import type { UpdateLearningGoalDto } from "./dto/update-learning-goal.dto";
import type { UpdateLearningPreferenceDto } from "./dto/update-learning-preference.dto";
import type { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import {
  dateKey,
  isValidIanaTimeZone,
  localDateAt,
  previousDate,
  timeText,
  timeValue,
} from "./learning-time";
import { LearningTelemetryService } from "./learning-telemetry.service";

@Injectable()
export class LearningSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly telemetry?: LearningTelemetryService,
  ) {}

  async getGoal(userId: string): Promise<LearningGoal> {
    return this.mapGoal(
      await this.prisma.learningGoal.upsert({
        where: { userId },
        update: {},
        create: { userId },
      }),
    );
  }

  async updateGoal(userId: string, input: UpdateLearningGoalDto): Promise<LearningGoal> {
    try {
      const goal = this.mapGoal(
        await this.prisma.learningGoal.upsert({
          where: { userId },
          update: { dailyTarget: input.dailyTarget },
          create: { userId, dailyTarget: input.dailyTarget },
        }),
      );
      this.telemetry?.recordGoal("updated");
      return goal;
    } catch (error) {
      this.telemetry?.recordGoal("failed");
      throw error;
    }
  }

  async getLearningPreference(userId: string): Promise<LearningPreference> {
    return this.mapLearningPreference(
      await this.prisma.learningPreference.upsert({
        where: { userId },
        update: {},
        create: { userId, timezone: "UTC" },
      }),
    );
  }

  async updateLearningPreference(
    userId: string,
    input: UpdateLearningPreferenceDto,
  ): Promise<LearningPreference> {
    try {
      if (!isValidIanaTimeZone(input.timezone)) {
        throw new BadRequestException("Invalid IANA timezone");
      }

      const preference = this.mapLearningPreference(
        await this.prisma.learningPreference.upsert({
          where: { userId },
          update: { timezone: input.timezone },
          create: { userId, timezone: input.timezone },
        }),
      );
      this.telemetry?.recordPreference({ outcome: "updated", preference: "timezone" });
      return preference;
    } catch (error) {
      this.telemetry?.recordPreference({ outcome: "failed", preference: "timezone" });
      throw error;
    }
  }

  async getNotificationPreference(userId: string): Promise<NotificationPreference> {
    return this.mapNotificationPreference(
      await this.prisma.notificationPreference.upsert({
        where: { userId },
        update: {},
        create: { userId, reminderLocalTime: timeValue("09:00") },
      }),
    );
  }

  async updateNotificationPreference(
    userId: string,
    input: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    try {
      const preference = this.mapNotificationPreference(
        await this.prisma.notificationPreference.upsert({
          where: { userId },
          update: {
            practiceReminderEnabled: input.practiceReminderEnabled,
            reminderLocalTime: timeValue(input.reminderLocalTime),
          },
          create: {
            userId,
            practiceReminderEnabled: input.practiceReminderEnabled,
            reminderLocalTime: timeValue(input.reminderLocalTime),
          },
        }),
      );
      this.telemetry?.recordPreference({ outcome: "updated", preference: "notification" });
      return preference;
    } catch (error) {
      this.telemetry?.recordPreference({ outcome: "failed", preference: "notification" });
      throw error;
    }
  }

  async getStreak(userId: string, at = new Date()): Promise<LearningStreak> {
    const preference = await this.prisma.learningPreference.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const today = localDateAt(at, preference?.timezone ?? "UTC");
    const days = await this.prisma.practiceDay.findMany({
      where: { userId, localDate: { lte: today } },
      orderBy: { localDate: "desc" },
      select: { localDate: true, completedActivityCount: true },
    });
    const byDate = new Map(days.map((day) => [dateKey(day.localDate), day]));
    const todayRecord = byDate.get(dateKey(today));
    const practicedToday = todayRecord !== undefined;
    let cursor = practicedToday ? today : previousDate(today);
    let currentDays = 0;

    while (byDate.has(dateKey(cursor))) {
      currentDays += 1;
      cursor = previousDate(cursor);
    }

    return {
      currentDays,
      practicedToday,
      todayCompletedActivities: todayRecord?.completedActivityCount ?? 0,
    };
  }

  private mapGoal(value: { dailyTarget: number; updatedAt: Date }): LearningGoal {
    return { dailyTarget: value.dailyTarget, updatedAt: value.updatedAt.toISOString() };
  }

  private mapLearningPreference(value: { timezone: string; updatedAt: Date }): LearningPreference {
    return { timezone: value.timezone, updatedAt: value.updatedAt.toISOString() };
  }

  private mapNotificationPreference(value: {
    practiceReminderEnabled: boolean;
    reminderLocalTime: Date;
    updatedAt: Date;
  }): NotificationPreference {
    return {
      practiceReminderEnabled: value.practiceReminderEnabled,
      reminderLocalTime: timeText(value.reminderLocalTime),
      deliveryAvailable: false,
      updatedAt: value.updatedAt.toISOString(),
    };
  }
}
