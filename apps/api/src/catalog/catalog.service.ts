import type {
  ActivityChoice,
  LessonDetail,
  LessonsResponse,
  PhraseDecksResponse,
} from "@fluyo/shared";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { EntitlementsService } from "../billing/entitlements.service";
import { ApiDomainException } from "../common/errors/api-domain.exception";
import { PrismaService } from "../database/prisma.service";
import {
  decodeLessonCursor,
  decodePhraseDeckCursor,
  encodeLessonCursor,
  encodePhraseDeckCursor,
} from "./catalog-pagination";
import type { CatalogListQueryDto } from "./dto/catalog-list-query.dto";

function entitlementAccess(entitlementKeys: string[]) {
  return {
    OR: [{ requiredEntitlementKey: null }, { requiredEntitlementKey: { in: entitlementKeys } }],
  };
}

function publicChoices(value: Prisma.JsonValue): ActivityChoice[] {
  if (!Array.isArray(value)) {
    throw new Error("Published activity choices are invalid");
  }

  return value.map((choice) => {
    if (
      typeof choice !== "object" ||
      choice === null ||
      Array.isArray(choice) ||
      typeof choice.id !== "string" ||
      typeof choice.label !== "string"
    ) {
      throw new Error("Published activity choice is invalid");
    }

    return { id: choice.id, label: choice.label };
  });
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async listLessons(userId: string, query: CatalogListQueryDto): Promise<LessonsResponse> {
    const entitlementKeys = await this.activeEntitlementKeys(userId);
    const cursor = query.cursor ? decodeLessonCursor(query.cursor) : null;
    const activityAccess = entitlementAccess(entitlementKeys);
    const lessons = await this.prisma.lesson.findMany({
      where: {
        archivedAt: null,
        AND: [
          entitlementAccess(entitlementKeys),
          {
            activities: {
              some: {
                archivedAt: null,
                publishedVersion: { not: null },
                ...activityAccess,
              },
            },
          },
          ...(cursor
            ? [
                {
                  OR: [
                    { sortOrder: { gt: cursor.sortOrder } },
                    { sortOrder: cursor.sortOrder, id: { gt: cursor.id } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        sortOrder: true,
        _count: {
          select: {
            activities: {
              where: {
                archivedAt: null,
                publishedVersion: { not: null },
                ...activityAccess,
              },
            },
          },
        },
      },
    });
    const hasMore = lessons.length > query.limit;
    const page = hasMore ? lessons.slice(0, query.limit) : lessons;
    const last = page.at(-1);

    return {
      items: page.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        activityCount: lesson._count.activities,
      })),
      hasMore,
      nextCursor: hasMore && last ? encodeLessonCursor(last.sortOrder, last.id) : null,
    };
  }

  async findLesson(userId: string, lessonId: string): Promise<LessonDetail> {
    const entitlementKeys = await this.activeEntitlementKeys(userId);
    const activityAccess = entitlementAccess(entitlementKeys);
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        archivedAt: null,
        ...entitlementAccess(entitlementKeys),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        activities: {
          where: {
            archivedAt: null,
            publishedVersion: { not: null },
            ...activityAccess,
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            kind: true,
            publishedVersion: true,
            publishedContent: { select: { prompt: true, choices: true } },
          },
        },
        phraseDeckMemberships: {
          where: {
            deck: {
              archivedAt: null,
              ...entitlementAccess(entitlementKeys),
            },
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: {
            deck: {
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                sourceLocale: true,
                targetLocale: true,
                phrases: {
                  orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                  select: { id: true, sourceText: true, targetText: true },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new ApiDomainException("resource_not_found");
    }

    const activities = lesson.activities.map((activity) => {
      if (activity.kind !== "PHRASE_CHOICE") {
        throw new Error("Published activity kind is unsupported");
      }
      if (activity.publishedVersion === null || activity.publishedContent === null) {
        throw new Error("Published activity content is missing");
      }

      return {
        id: activity.id,
        kind: "phrase_choice" as const,
        contentVersion: activity.publishedVersion,
        prompt: activity.publishedContent.prompt,
        choices: publicChoices(activity.publishedContent.choices),
      };
    });

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      activityCount: activities.length,
      activities,
      phraseDecks: lesson.phraseDeckMemberships.map(({ deck }) => ({
        id: deck.id,
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        sourceLocale: deck.sourceLocale,
        targetLocale: deck.targetLocale,
        phraseCount: deck.phrases.length,
        phrases: deck.phrases,
      })),
    };
  }

  async listPhraseDecks(userId: string, query: CatalogListQueryDto): Promise<PhraseDecksResponse> {
    const entitlementKeys = await this.activeEntitlementKeys(userId);
    const cursor = query.cursor ? decodePhraseDeckCursor(query.cursor) : null;
    const decks = await this.prisma.phraseDeck.findMany({
      where: {
        archivedAt: null,
        AND: [
          entitlementAccess(entitlementKeys),
          ...(cursor
            ? [
                {
                  OR: [{ slug: { gt: cursor.slug } }, { slug: cursor.slug, id: { gt: cursor.id } }],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ slug: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        sourceLocale: true,
        targetLocale: true,
        _count: { select: { phrases: true } },
      },
    });
    const hasMore = decks.length > query.limit;
    const page = hasMore ? decks.slice(0, query.limit) : decks;
    const last = page.at(-1);

    return {
      items: page.map((deck) => ({
        id: deck.id,
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        sourceLocale: deck.sourceLocale,
        targetLocale: deck.targetLocale,
        phraseCount: deck._count.phrases,
      })),
      hasMore,
      nextCursor: hasMore && last ? encodePhraseDeckCursor(last.slug, last.id) : null,
    };
  }

  private async activeEntitlementKeys(userId: string): Promise<string[]> {
    return (await this.entitlements.listActive(userId)).map((entitlement) => entitlement.key);
  }
}
