import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreatePortalSessionDto } from "./create-portal-session.dto";

async function validateInput(input: Record<string, unknown>) {
  return validate(plainToInstance(CreatePortalSessionDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true,
  });
}

describe("CreatePortalSessionDto", () => {
  it("accepts an empty Customer Portal request", async () => {
    await expect(validateInput({})).resolves.toEqual([]);
  });

  it("rejects browser-controlled Stripe IDs, return URLs, and unknown fields", async () => {
    await expect(validateInput({ customerId: "cus_browser_value" })).resolves.not.toEqual([]);
    await expect(validateInput({ returnUrl: "https://attacker.example" })).resolves.not.toEqual([]);
    await expect(validateInput({ subscriptionId: "sub_browser_value" })).resolves.not.toEqual([]);
  });
});
