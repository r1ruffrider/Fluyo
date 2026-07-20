import { Transform } from "class-transformer";
import { IsString, Length, ValidateIf } from "class-validator";

export class UpdateCurrentProfileDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Length(1, 80)
  displayName!: string | null;
}
