import { describe, expect, it, vi } from "vitest";

import type { EntitlementsService } from "../billing/entitlements.service";
import { ApiDomainException } from "../common/errors/api-domain.exception";
import type { PrismaService } from "../database/prisma.service";
import { decodeLessonCursor, decodePhraseDeckCursor } from "./catalog-pagination";
import { CatalogService } from "./catalog.service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_LESSON_ID = "44444444-4444-4444-8444-444444444444";
const ACTIVITY_ID = "55555555-5555-4555-8555-555555555555";
const DECK_ID = "66666666-6666-4666-8666-666666666666";
const SECOND_DECK_ID = "77777777-7777-4777-8777-777777777777";

function createPrismaMock() {
  return {
    lesson: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    phraseDeck: {
      findMany: vi.fn(),
    },
  };
}

function createEntitlementsMock() {
  return { listActive: vi.fn() };
}

describe("CatalogService", () => {
  it("returns a deterministic lesson page and an opaque continuation cursor", async () => {
    const prisma = createPrismaMock();
    prisma.lesson.findMany.mockResolvedValue([
      {
        id: LESSON_ID,
        slug: "first-conversations",
        title: "First conversations",
        description: "Start speaking",
        sortOrder: 1,
        _count: { activities: 3 },
      },
      {
        id: SECOND_LESSON_ID,
        slug: "travel-basics",
        title: "Travel basics",
        description: null,
        sortOrder: 2,
        _count: { activities: 2 },
      },
    ]);
    const entitlements = createEntitlementsMock();
    entitlements.listActive.mockResolvedValue([]);
    const service = new CatalogService(
      prisma as unknown as PrismaService,
      entitlements as unknown as EntitlementsService,
    );

    const response = await service.listLessons(USER_A, { limit: 1 });

    expect(response.items).toEqual([
      {
        id: LESSON_ID,
        slug: "first-conversations",
        title: "First conversations",
        description: "Start speaking",
        activityCount: 3,
      },
    ]);
    expect(response.hasMore).toBe(true);
    expect(response.nextCursor).not.toBeNull();
    expect(decodeLessonCursor(response.nextCursor!)).toMatchObject({
      id: LESSON_ID,
      sortOrder: 1,
    });
    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        take: 2,
      }),
    );
  });

  it("allows only the verified user with the required entitlement to read a paid lesson", async () => {
    const prisma = createPrismaMock();
    prisma.lesson.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      const access = where.OR as Array<{
        requiredEntitlementKey?: { in: string[] } | null;
      }>;
      const allowedKeys = access[1]?.requiredEntitlementKey;
      return Promise.resolve(
        allowedKeys && "in" in allowedKeys && allowedKeys.in.includes("catalog.plus")
          ? {
              id: LESSON_ID,
              slug: "paid-lesson",
              title: "Paid lesson",
              description: null,
              activities: [
                {
                  id: ACTIVITY_ID,
                  kind: "PHRASE_CHOICE",
                  publishedVersion: 1,
                  publishedContent: {
                    prompt: "Choose hello",
                    choices: [{ id: "hola", label: "Hola" }],
                  },
                },
              ],
              phraseDeckMemberships: [
                {
                  deck: {
                    id: DECK_ID,
                    slug: "greetings",
                    title: "Greetings",
                    description: null,
                    sourceLocale: "en",
                    targetLocale: "es",
                    phrases: [
                      {
                        id: "88888888-8888-4888-8888-888888888888",
                        sourceText: "Hello",
                        targetText: "Hola",
                      },
                    ],
                  },
                },
              ],
            }
          : null,
      );
    });
    const entitlements = createEntitlementsMock();
    entitlements.listActive.mockImplementation((userId: string) =>
      Promise.resolve(
        userId === USER_A ? [{ key: "catalog.plus", startsAt: null, endsAt: null }] : [],
      ),
    );
    const service = new CatalogService(
      prisma as unknown as PrismaService,
      entitlements as unknown as EntitlementsService,
    );

    await expect(service.findLesson(USER_A, LESSON_ID)).resolves.toMatchObject({
      id: LESSON_ID,
      activityCount: 1,
      activities: [{ id: ACTIVITY_ID, kind: "phrase_choice", contentVersion: 1 }],
      phraseDecks: [{ id: DECK_ID, phraseCount: 1 }],
    });
    const denied = await service.findLesson(USER_B, LESSON_ID).catch((error: unknown) => error);

    expect(denied).toBeInstanceOf(ApiDomainException);
    expect(denied).toMatchObject({ code: "resource_not_found" });
    expect(entitlements.listActive).toHaveBeenNthCalledWith(1, USER_A);
    expect(entitlements.listActive).toHaveBeenNthCalledWith(2, USER_B);
  });

  it("filters nested activities and decks with the same caller-owned entitlement set", async () => {
    const prisma = createPrismaMock();
    prisma.lesson.findFirst.mockResolvedValue(null);
    const entitlements = createEntitlementsMock();
    entitlements.listActive.mockResolvedValue([
      { key: "catalog.plus", startsAt: null, endsAt: null },
    ]);
    const service = new CatalogService(
      prisma as unknown as PrismaService,
      entitlements as unknown as EntitlementsService,
    );

    await service.findLesson(USER_A, LESSON_ID).catch(() => undefined);

    const query = prisma.lesson.findFirst.mock.calls[0]?.[0];
    expect(query.select.activities.where.OR[1].requiredEntitlementKey.in).toEqual(["catalog.plus"]);
    expect(query.select.phraseDeckMemberships.where.deck.OR[1].requiredEntitlementKey.in).toEqual([
      "catalog.plus",
    ]);
  });

  it("returns phrase decks in stable slug order with an endpoint-specific cursor", async () => {
    const prisma = createPrismaMock();
    prisma.phraseDeck.findMany.mockResolvedValue([
      {
        id: DECK_ID,
        slug: "greetings",
        title: "Greetings",
        description: null,
        sourceLocale: "en",
        targetLocale: "es",
        _count: { phrases: 4 },
      },
      {
        id: SECOND_DECK_ID,
        slug: "travel",
        title: "Travel",
        description: null,
        sourceLocale: "en",
        targetLocale: "es",
        _count: { phrases: 3 },
      },
    ]);
    const entitlements = createEntitlementsMock();
    entitlements.listActive.mockResolvedValue([]);
    const service = new CatalogService(
      prisma as unknown as PrismaService,
      entitlements as unknown as EntitlementsService,
    );

    const response = await service.listPhraseDecks(USER_A, { limit: 1 });

    expect(response.items[0]).toMatchObject({ id: DECK_ID, phraseCount: 4 });
    expect(response.hasMore).toBe(true);
    expect(decodePhraseDeckCursor(response.nextCursor!)).toMatchObject({
      id: DECK_ID,
      slug: "greetings",
    });
  });
});
