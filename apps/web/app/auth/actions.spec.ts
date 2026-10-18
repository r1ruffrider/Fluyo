import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClientMock, redirectMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("../../lib/supabase/config", () => ({
  getPublicWebUrl: () => "http://localhost:3000",
}));
vi.mock("../../lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

import { signIn, signUp } from "./actions";

function credentials(next: string): FormData {
  const formData = new FormData();
  formData.set("email", "learner@example.com");
  formData.set("password", "valid-password");
  formData.set("next", next);
  return formData;
}

describe("authentication return routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((destination: string) => {
      throw new Error(`redirect:${destination}`);
    });
  });

  it("preserves the safe return path after invalid sign-in input", async () => {
    const formData = credentials("/dashboard");
    formData.set("password", "short");

    await expect(signIn(formData)).rejects.toThrow(
      "redirect:/login?error=invalid_input&next=%2Fdashboard",
    );
  });

  it("preserves the safe return path after rejected credentials", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error("rejected") }) },
    });

    await expect(signIn(credentials("/dashboard"))).rejects.toThrow(
      "redirect:/login?error=invalid_credentials&next=%2Fdashboard",
    );
  });

  it("preserves the safe return path after invalid sign-up input", async () => {
    const formData = credentials("/dashboard");
    formData.set("email", "invalid");

    await expect(signUp(formData)).rejects.toThrow(
      "redirect:/login?error=invalid_input&next=%2Fdashboard",
    );
  });

  it("uses the safe fallback after a rejected sign-up with an untrusted return value", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { signUp: vi.fn().mockResolvedValue({ data: {}, error: new Error("rejected") }) },
    });

    await expect(signUp(credentials("https://evil.example"))).rejects.toThrow(
      "redirect:/login?error=signup_failed&next=%2Faccount",
    );
  });
});
