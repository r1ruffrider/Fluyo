import { LEARNING_DEFAULT_PAGE_LIMIT, LEARNING_MAX_PAGE_LIMIT } from "@fluyo/shared";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CatalogListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LEARNING_MAX_PAGE_LIMIT)
  limit = LEARNING_DEFAULT_PAGE_LIMIT;
}
