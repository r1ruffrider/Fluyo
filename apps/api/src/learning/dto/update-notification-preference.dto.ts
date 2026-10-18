import { IsBoolean, IsString, Matches } from "class-validator";

export class UpdateNotificationPreferenceDto {
  @IsBoolean()
  practiceReminderEnabled!: boolean;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  reminderLocalTime!: string;
}
