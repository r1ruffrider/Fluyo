import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdateLearningPreferenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  timezone!: string;
}
