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
});
