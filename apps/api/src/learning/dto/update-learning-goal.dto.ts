import { LEARNING_MAX_DAILY_TARGET, LEARNING_MIN_DAILY_TARGET } from "@fluyo/shared";
import { IsInt, Max, Min } from "class-validator";

export class UpdateLearningGoalDto {
  @IsInt()
  @Min(LEARNING_MIN_DAILY_TARGET)
  @Max(LEARNING_MAX_DAILY_TARGET)
  dailyTarget!: number;
}
