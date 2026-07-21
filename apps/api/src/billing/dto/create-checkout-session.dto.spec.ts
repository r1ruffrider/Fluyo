import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateCheckoutSessionDto } from "./create-checkout-session.dto";

async function validateInput(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateCheckoutSessionDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true,
  });
}

describe("CreateCheckoutSessionDto", () => {
  it("accepts only an internal plan key and an approved billing interval", async () => {
    await expect(validateInput({ planKey: "fluyo_plus", interval: "monthly" })).resolves.toEqual(
      [],
    );
    await expect(validateInput({ planKey: "fluyo_plus", interval: "annual" })).resolves.toEqual([]);
  });

  it("rejects unsupported intervals and malformed plan keys", async () => {
    await expect(validateInput({ planKey: "fluyo_plus", interval: "weekly" })).resolves.not.toEqual(
      [],
    );
    await expect(
      validateInput({ planKey: "FLUYO PLUS", interval: "monthly" }),
    ).resolves.not.toEqual([]);
  });

  it("rejects browser-supplied Stripe IDs and return URLs", async () => {
    await expect(
      validateInput({
        planKey: "fluyo_plus",
        interval: "monthly",
        priceId: "price_browser_value",
        customerId: "cus_browser_value",
        successUrl: "https://attacker.example",
      }),
    ).resolves.not.toEqual([]);
  });
});
