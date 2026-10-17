import { HttpException, HttpStatus } from "@nestjs/common";

const API_DOMAIN_ERROR_DEFINITIONS = {
  resource_not_found: {
    message: "The requested resource was not found",
    status: HttpStatus.NOT_FOUND,
  },
  content_version_conflict: {
    message: "The activity content has changed",
    status: HttpStatus.CONFLICT,
  },
  idempotency_conflict: {
    message: "The idempotency key was already used for a different request",
    status: HttpStatus.CONFLICT,
  },
  rate_limited: {
    message: "Too many activity attempts",
    status: HttpStatus.TOO_MANY_REQUESTS,
  },
} as const;

export type ApiDomainErrorCode = keyof typeof API_DOMAIN_ERROR_DEFINITIONS;

interface ApiDomainExceptionOptions {
  details?: Readonly<Record<string, unknown>>;
  retryAfterSeconds?: number;
}

export class ApiDomainException extends HttpException {
  readonly code: ApiDomainErrorCode;
  readonly retryAfterSeconds: number | null;
  readonly safeDetails: Readonly<Record<string, unknown>>;
  readonly safeMessage: string;

  constructor(code: ApiDomainErrorCode, options: ApiDomainExceptionOptions = {}) {
    const definition = API_DOMAIN_ERROR_DEFINITIONS[code];
    super(definition.message, definition.status);

    if (code === "rate_limited") {
      if (!Number.isInteger(options.retryAfterSeconds) || (options.retryAfterSeconds ?? 0) < 1) {
        throw new Error("Retry-After must be a positive integer number of seconds");
      }
    } else if (options.retryAfterSeconds !== undefined) {
      throw new Error("Retry-After is only valid for rate-limited errors");
    }

    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.safeDetails =
      code === "rate_limited"
        ? { retryAfterSeconds: this.retryAfterSeconds }
        : (options.details ?? {});
    this.safeMessage = definition.message;
  }
}

export function rateLimitedException(retryAfterSeconds: number): ApiDomainException {
  return new ApiDomainException("rate_limited", {
    retryAfterSeconds,
  });
}
