import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";

function createPrismaMock() {
  return {
    stripeWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("StripeWebhookEventLedgerService", () => {
  it("detects an already processed Stripe event", async () => {
    const prisma = createPrismaMock();
    prisma.stripeWebhookEvent.findUnique.mockResolvedValue({ id: "evt_placeholder" });
    const service = new StripeWebhookEventLedgerService(prisma as unknown as PrismaService);

    await expect(service.hasProcessed("evt_placeholder")).resolves.toBe(true);
  });

  it("records an event for the verified processor's transaction", async () => {
    const prisma = createPrismaMock();
    prisma.stripeWebhookEvent.create.mockResolvedValue({ id: "evt_placeholder" });
    const service = new StripeWebhookEventLedgerService(prisma as unknown as PrismaService);

    await expect(
      service.recordProcessed("evt_placeholder", "customer.subscription.updated"),
    ).resolves.toBeUndefined();
    expect(prisma.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_placeholder", type: "customer.subscription.updated" },
      select: { id: true },
    });
  });
});
