import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { UpdateCurrentProfileDto } from "./update-current-profile.dto";

async function validateInput(input: Record<string, unknown>) {
  return validate(plainToInstance(UpdateCurrentProfileDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true,
  });
}

describe("UpdateCurrentProfileDto", () => {
  it("accepts a trimmed display name or null", async () => {
    await expect(validateInput({ displayName: "  Ana  " })).resolves.toEqual([]);
    await expect(validateInput({ displayName: null })).resolves.toEqual([]);
  });

  it("rejects missing, empty, or oversized display names", async () => {
    await expect(validateInput({})).resolves.not.toEqual([]);
    await expect(validateInput({ displayName: "   " })).resolves.not.toEqual([]);
    await expect(validateInput({ displayName: "a".repeat(81) })).resolves.not.toEqual([]);
  });

  it("rejects a client-selected owner ID", async () => {
    await expect(
      validateInput({
        displayName: "Ana",
        id: "22222222-2222-4222-8222-222222222222",
      }),
    ).resolves.not.toEqual([]);
  });
});
