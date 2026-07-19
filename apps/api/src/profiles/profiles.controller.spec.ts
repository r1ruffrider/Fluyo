import { describe, expect, it, vi } from "vitest";

import { ProfilesController } from "./profiles.controller";
import type { ProfilesService } from "./profiles.service";

const IDENTITY = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
};

describe("ProfilesController", () => {
  it("reads the profile using the verified identity ID", async () => {
    const profiles = {
      findCurrent: vi.fn().mockResolvedValue(null),
    } as unknown as ProfilesService;
    const controller = new ProfilesController(profiles);

    await expect(controller.getCurrent(IDENTITY)).resolves.toEqual({ profile: null });
    expect(profiles.findCurrent).toHaveBeenCalledWith(IDENTITY.id);
  });

  it("updates the profile using the verified identity ID", async () => {
    const updated = {
      id: IDENTITY.id,
      displayName: "Ana",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:01:00.000Z",
    };
    const profiles = {
      updateCurrent: vi.fn().mockResolvedValue(updated),
    } as unknown as ProfilesService;
    const controller = new ProfilesController(profiles);

    await expect(controller.updateCurrent(IDENTITY, { displayName: "Ana" })).resolves.toEqual(
      updated,
    );
    expect(profiles.updateCurrent).toHaveBeenCalledWith(IDENTITY.id, { displayName: "Ana" });
  });
});
