import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  decodeLessonCursor,
  decodePhraseDeckCursor,
  encodeLessonCursor,
  encodePhraseDeckCursor,
} from "./catalog-pagination";

const ID = "11111111-1111-4111-8111-111111111111";

describe("catalog pagination cursors", () => {
  it("round-trips lesson and phrase-deck cursor keys", () => {
    expect(decodeLessonCursor(encodeLessonCursor(3, ID))).toEqual({
      version: 1,
      resource: "lessons",
      sortOrder: 3,
      id: ID,
    });
    expect(decodePhraseDeckCursor(encodePhraseDeckCursor("greetings", ID))).toEqual({
      version: 1,
      resource: "phrase_decks",
      slug: "greetings",
      id: ID,
    });
  });

  it("rejects malformed and cross-resource cursors", () => {
    expect(() => decodeLessonCursor("not-json")).toThrow(BadRequestException);
    expect(() => decodeLessonCursor(encodePhraseDeckCursor("greetings", ID))).toThrow(
      BadRequestException,
    );
    expect(() => decodePhraseDeckCursor(encodeLessonCursor(1, ID))).toThrow(BadRequestException);
  });

  it("accepts the PostgreSQL integer boundary and rejects larger lesson sort keys", () => {
    expect(decodeLessonCursor(encodeLessonCursor(2_147_483_647, ID))).toMatchObject({
      sortOrder: 2_147_483_647,
    });
    expect(() => decodeLessonCursor(encodeLessonCursor(2_147_483_648, ID))).toThrow(
      BadRequestException,
    );
    expect(() => decodeLessonCursor(encodeLessonCursor(Number.MAX_SAFE_INTEGER + 1, ID))).toThrow(
      BadRequestException,
    );
  });

  it("rejects a phrase-deck cursor containing PostgreSQL-invalid NUL text", () => {
    expect(() => decodePhraseDeckCursor(encodePhraseDeckCursor("a\0b", ID))).toThrow(
      BadRequestException,
    );
  });
});
