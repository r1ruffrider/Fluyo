import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function createPrismaMock() {
  return {
    stripeCustomer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("StripeCustomerMappingsService", () => {
  it("looks up the provider customer ID by verified user UUID", async () => {
    const prisma = createPrismaMock();
    prisma.stripeCustomer.findUnique.mockResolvedValue({ stripeCustomerId: "cus_placeholder" });
    const service = new StripeCustomerMappingsService(prisma as unknown as PrismaService);

    await expect(service.findCustomerId(USER_ID)).resolves.toBe("cus_placeholder");
    expect(prisma.stripeCustomer.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      select: { stripeCustomerId: true },
    });
  });

  it("creates mappings only in the server-side repository", async () => {
    const prisma = createPrismaMock();
    prisma.stripeCustomer.create.mockResolvedValue({ userId: USER_ID });
    const service = new StripeCustomerMappingsService(prisma as unknown as PrismaService);

    await expect(service.createMapping(USER_ID, "cus_placeholder")).resolves.toBeUndefined();
    expect(prisma.stripeCustomer.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, stripeCustomerId: "cus_placeholder" },
      select: { userId: true },
    });
  });
});
