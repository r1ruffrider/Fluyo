import { BadRequestException } from "@nestjs/common";
import { isUUID } from "class-validator";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

interface LessonCursor {
  id: string;
  resource: "lessons";
  sortOrder: number;
  version: 1;
}

interface PhraseDeckCursor {
  id: string;
  resource: "phrase_decks";
  slug: string;
  version: 1;
}

function encode(value: LessonCursor | PhraseDeckCursor): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(cursor: string): unknown {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new BadRequestException("Invalid catalog cursor");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function encodeLessonCursor(sortOrder: number, id: string): string {
  return encode({ version: 1, resource: "lessons", sortOrder, id });
}

export function decodeLessonCursor(cursor: string): LessonCursor {
  const value = decode(cursor);
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.resource !== "lessons" ||
    !Number.isSafeInteger(value.sortOrder) ||
    (value.sortOrder as number) < 1 ||
    (value.sortOrder as number) > POSTGRES_INTEGER_MAX ||
    typeof value.id !== "string" ||
    !isUUID(value.id, 4)
  ) {
    throw new BadRequestException("Invalid catalog cursor");
  }

  return value as unknown as LessonCursor;
}

export function encodePhraseDeckCursor(slug: string, id: string): string {
  return encode({ version: 1, resource: "phrase_decks", slug, id });
}

export function decodePhraseDeckCursor(cursor: string): PhraseDeckCursor {
  const value = decode(cursor);
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.resource !== "phrase_decks" ||
    typeof value.slug !== "string" ||
    value.slug.length < 1 ||
    value.slug.length > 120 ||
    value.slug.includes("\0") ||
    typeof value.id !== "string" ||
    !isUUID(value.id, 4)
  ) {
    throw new BadRequestException("Invalid catalog cursor");
  }

  return value as unknown as PhraseDeckCursor;
}
