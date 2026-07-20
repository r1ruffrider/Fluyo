import { ConfigService } from "@nestjs/config";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTVerifyGetKey,
  type KeyLike,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { SupabaseJwtService } from "./supabase-jwt.service";

const AUDIENCE = "authenticated";
const ISSUER = "https://project.supabase.co/auth/v1";
const SUBJECT = "11111111-1111-4111-8111-111111111111";

describe("SupabaseJwtService", () => {
  let privateKey: KeyLike;
  let service: SupabaseJwtService;

  beforeAll(async () => {
    const keyPair = await generateKeyPair("ES256");
    const publicJwk = await exportJWK(keyPair.publicKey);
    const jwks: JWTVerifyGetKey = createLocalJWKSet({
      keys: [{ ...publicJwk, alg: "ES256", kid: "test-key", use: "sig" }],
    });
    const config = new ConfigService({
      auth: { audience: AUDIENCE, issuer: ISSUER },
    });

    privateKey = keyPair.privateKey;
    service = new SupabaseJwtService(jwks, config);
  });

  async function signToken(overrides?: {
    audience?: string;
    expiresAt?: number | string;
    issuer?: string;
    omitExpiration?: boolean;
    subject?: string;
  }): Promise<string> {
    const builder = new SignJWT({ email: "learner@example.com" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject(overrides?.subject ?? SUBJECT)
      .setIssuer(overrides?.issuer ?? ISSUER)
      .setAudience(overrides?.audience ?? AUDIENCE)
      .setIssuedAt();

    if (!overrides?.omitExpiration) {
      builder.setExpirationTime(overrides?.expiresAt ?? "5m");
    }

    return builder.sign(privateKey);
  }

  it("returns a minimal provider-neutral identity for a valid Supabase token", async () => {
    await expect(service.verify(await signToken())).resolves.toEqual({
      id: SUBJECT,
      email: "learner@example.com",
    });
  });

  it("rejects a token from a different issuer", async () => {
    await expect(
      service.verify(await signToken({ issuer: "https://attacker.example/auth/v1" })),
    ).rejects.toThrow();
  });

  it("rejects a token signed by an untrusted key", async () => {
    const attackerKeyPair = await generateKeyPair("ES256");
    const token = await new SignJWT({ email: "learner@example.com" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject(SUBJECT)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(attackerKeyPair.privateKey);

    await expect(service.verify(token)).rejects.toThrow();
  });

  it("rejects a token for a different audience", async () => {
    await expect(service.verify(await signToken({ audience: "other-api" }))).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    await expect(
      service.verify(await signToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 })),
    ).rejects.toThrow();
  });

  it("rejects a token without an expiration", async () => {
    await expect(service.verify(await signToken({ omitExpiration: true }))).rejects.toThrow();
  });

  it("rejects a token without a UUID user subject", async () => {
    await expect(service.verify(await signToken({ subject: "not-a-user-id" }))).rejects.toThrow(
      "invalid subject",
    );
  });
});
