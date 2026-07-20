import { describe, expect, it } from "vitest";

import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  it("returns only the verified identity contract", () => {
    const controller = new AuthController();
    const identity = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "learner@example.com",
    };

    expect(controller.getCurrentIdentity(identity)).toEqual({ identity });
  });
});
