import { randomUUID } from "node:crypto";

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

import type { Request, Response } from "express";

function errorCode(status: number): string {
  const codes: Partial<Record<number, string>> = {
    [HttpStatus.BAD_REQUEST]: "invalid_request",
    [HttpStatus.UNAUTHORIZED]: "authentication_required",
    [HttpStatus.FORBIDDEN]: "access_denied",
    [HttpStatus.NOT_FOUND]: "not_found",
    [HttpStatus.TOO_MANY_REQUESTS]: "rate_limited",
  };

  return codes[status] ?? "internal_error";
}

function errorMessage(status: number): string {
  const messages: Partial<Record<number, string>> = {
    [HttpStatus.BAD_REQUEST]: "The request is invalid",
    [HttpStatus.UNAUTHORIZED]: "Authentication is required",
    [HttpStatus.FORBIDDEN]: "Access is denied",
    [HttpStatus.NOT_FOUND]: "The requested resource was not found",
    [HttpStatus.TOO_MANY_REQUESTS]: "Too many requests",
  };

  return messages[status] ?? "An unexpected error occurred";
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseCorrelationId = response.getHeader("x-correlation-id");
    const requestCorrelationId = request.headers["x-correlation-id"];
    const correlationId =
      typeof responseCorrelationId === "string"
        ? responseCorrelationId
        : typeof requestCorrelationId === "string" && requestCorrelationId.length > 0
          ? requestCorrelationId
          : randomUUID();

    response.setHeader("x-correlation-id", correlationId);
    response.status(status).json({
      error: {
        code: errorCode(status),
        message: errorMessage(status),
        details: {},
        correlationId,
      },
    });
  }
}
