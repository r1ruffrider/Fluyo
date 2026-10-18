import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { SupabaseJwtService } from "../auth/supabase-jwt.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const LESSON_ID = "33333333-3333-4333-8333-333333333333";

describe("CatalogController integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function startApplication() {
    const verify = vi.fn().mockImplementation((token: string) => {
      const id = token === "user-a-token" ? USER_A : USER_B;
      return Promise.resolve({ id, email: null });
    });
    const listLessons = vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    const findLesson = vi.fn().mockResolvedValue({ id: LESSON_ID });
    const listPhraseDecks = vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        SupabaseJwtGuard,
        { provide: SupabaseJwtService, useValue: { verify } },
        {
          provide: CatalogService,
          useValue: { listLessons, findLesson, listPhraseDecks },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };
    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      findLesson,
      listLessons,
      listPhraseDecks,
    };
  }

  it("rejects unauthenticated catalog reads", async () => {
    const fixture = await startApplication();

    const response = await fetch(`${fixture.baseUrl}/lessons`);

    expect(response.status).toBe(401);
    expect(fixture.listLessons).not.toHaveBeenCalled();
  });

  it("passes each verified identity only to its own catalog authorization query", async () => {
    const fixture = await startApplication();

    const userAResponse = await fetch(`${fixture.baseUrl}/lessons/${LESSON_ID}`, {
      headers: { authorization: "Bearer user-a-token" },
    });
    const userBResponse = await fetch(`${fixture.baseUrl}/lessons/${LESSON_ID}`, {
      headers: { authorization: "Bearer user-b-token" },
    });

    expect(userAResponse.status).toBe(200);
    expect(userBResponse.status).toBe(200);
    expect(fixture.findLesson).toHaveBeenNthCalledWith(1, USER_A, LESSON_ID);
    expect(fixture.findLesson).toHaveBeenNthCalledWith(2, USER_B, LESSON_ID);
  });

  it("transforms valid limits and rejects oversized or unknown query fields", async () => {
    const fixture = await startApplication();
    const headers = { authorization: "Bearer user-a-token" };

    const valid = await fetch(`${fixture.baseUrl}/lessons?limit=5`, { headers });
    const oversized = await fetch(`${fixture.baseUrl}/lessons?limit=51`, { headers });
    const unknown = await fetch(`${fixture.baseUrl}/phrase-decks?ownerId=${USER_B}`, { headers });

    expect(valid.status).toBe(200);
    expect(fixture.listLessons).toHaveBeenCalledWith(USER_A, { limit: 5 });
    expect(oversized.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(fixture.listPhraseDecks).not.toHaveBeenCalled();
  });
});
