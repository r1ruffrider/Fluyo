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
  headers?: Readonly<Record<string, string>>;
}

export class ApiDomainException extends HttpException {
  readonly code: ApiDomainErrorCode;
  readonly safeDetails: Readonly<Record<string, unknown>>;
  readonly safeHeaders: Readonly<Record<string, string>>;
  readonly safeMessage: string;

  constructor(code: ApiDomainErrorCode, options: ApiDomainExceptionOptions = {}) {
    const definition = API_DOMAIN_ERROR_DEFINITIONS[code];
    super(definition.message, definition.status);
    this.code = code;
    this.safeDetails = options.details ?? {};
    this.safeHeaders = options.headers ?? {};
    this.safeMessage = definition.message;
  }
}

export function rateLimitedException(retryAfterSeconds: number): ApiDomainException {
  if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1) {
    throw new Error("Retry-After must be a positive integer number of seconds");
  }

  return new ApiDomainException("rate_limited", {
    details: { retryAfterSeconds },
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}
