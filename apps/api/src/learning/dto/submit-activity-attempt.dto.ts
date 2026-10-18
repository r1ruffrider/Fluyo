import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

export class SubmitActivityAttemptDto {
  @IsInt()
  @Min(1)
  contentVersion!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  selectedChoiceId!: string;
}
