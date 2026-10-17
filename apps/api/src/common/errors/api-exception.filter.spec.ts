import type { ArgumentsHost } from "@nestjs/common";
import { ConflictException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { ApiDomainException, rateLimitedException } from "./api-domain.exception";
import { ApiExceptionFilter } from "./api-exception.filter";

interface ResponseFixture {
  body: ReturnType<typeof vi.fn>;
  headers: Map<string, string>;
  host: ArgumentsHost;
  status: ReturnType<typeof vi.fn>;
}

function createFixture(requestCorrelationId = "request-correlation-id"): ResponseFixture {
  const headers = new Map<string, string>();
  const body = vi.fn();
  const response = {
    getHeader: vi.fn((name: string) => headers.get(name)),
    json: body,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
      return response;
    }),
    status: vi.fn(() => response),
  } as unknown as Response;
  const request = {
    headers: { "x-correlation-id": requestCorrelationId },
  } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getNext: vi.fn(),
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return {
    body,
    headers,
    host,
    status: response.status as unknown as ReturnType<typeof vi.fn>,
  };
}

describe("ApiExceptionFilter", () => {
  it.each([
    ["resource_not_found", HttpStatus.NOT_FOUND],
    ["content_version_conflict", HttpStatus.CONFLICT],
    ["idempotency_conflict", HttpStatus.CONFLICT],
  ] as const)("preserves the allowlisted %s domain error", (code, expectedStatus) => {
    const fixture = createFixture();

    new ApiExceptionFilter().catch(new ApiDomainException(code), fixture.host);

    expect(fixture.status).toHaveBeenCalledWith(expectedStatus);
    expect(fixture.body).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code,
        correlationId: "request-correlation-id",
        details: {},
      }),
    });
  });

  it("returns safe rate-limit details and Retry-After", () => {
    const fixture = createFixture();

    new ApiExceptionFilter().catch(rateLimitedException(17), fixture.host);

    expect(fixture.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(fixture.headers.get("Retry-After")).toBe("17");
    expect(fixture.body).toHaveBeenCalledWith({
      error: {
        code: "rate_limited",
        correlationId: "request-correlation-id",
        details: { retryAfterSeconds: 17 },
        message: "Too many activity attempts",
      },
    });
  });

  it("rejects an invalid Retry-After value before it reaches a response header", () => {
    expect(() => rateLimitedException(0)).toThrow(
      "Retry-After must be a positive integer number of seconds",
    );
    expect(() => rateLimitedException(1.5)).toThrow(
      "Retry-After must be a positive integer number of seconds",
    );
  });

  it("does not emit arbitrary properties as response headers", () => {
    const fixture = createFixture();
    const exception = new ApiDomainException("resource_not_found") as ApiDomainException & {
      headers: Record<string, string>;
    };
    exception.headers = {
      "Set-Cookie": "unsafe=value",
      "Access-Control-Allow-Origin": "*",
    };

    new ApiExceptionFilter().catch(exception, fixture.host);

    expect(fixture.headers.has("Set-Cookie")).toBe(false);
    expect(fixture.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("keeps unknown conflict errors behind the generic boundary", () => {
    const fixture = createFixture();

    new ApiExceptionFilter().catch(new ConflictException("database detail"), fixture.host);

    expect(fixture.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(fixture.body).toHaveBeenCalledWith({
      error: {
        code: "internal_error",
        correlationId: "request-correlation-id",
        details: {},
        message: "An unexpected error occurred",
      },
    });
  });
});
