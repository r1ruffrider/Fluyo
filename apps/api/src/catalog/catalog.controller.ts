import type {
  AuthenticatedIdentity,
  LessonDetail,
  LessonsResponse,
  PhraseDecksResponse,
} from "@fluyo/shared";
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { CatalogService } from "./catalog.service";
import { CatalogListQueryDto } from "./dto/catalog-list-query.dto";

@Controller()
@UseGuards(SupabaseJwtGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("lessons")
  listLessons(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Query() query: CatalogListQueryDto,
  ): Promise<LessonsResponse> {
    return this.catalog.listLessons(identity.id, query);
  }

  @Get("lessons/:lessonId")
  findLesson(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Param("lessonId", new ParseUUIDPipe({ version: "4" })) lessonId: string,
  ): Promise<LessonDetail> {
    return this.catalog.findLesson(identity.id, lessonId);
  }

  @Get("phrase-decks")
  listPhraseDecks(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Query() query: CatalogListQueryDto,
  ): Promise<PhraseDecksResponse> {
    return this.catalog.listPhraseDecks(identity.id, query);
  }
}
