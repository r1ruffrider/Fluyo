import { randomUUID } from "node:crypto";

import type { Params } from "nestjs-pino";

export function createLoggerConfig(): Params {
  return {
    pinoHttp: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      genReqId(request, response) {
        const header = request.headers["x-correlation-id"];
        const candidate = Array.isArray(header) ? header[0] : header;
        const correlationId =
          typeof candidate === "string" && candidate.length > 0 ? candidate : randomUUID();

        response.setHeader("x-correlation-id", correlationId);
        return correlationId;
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.apikey",
          "req.headers.cookie",
          "req.headers.stripe-signature",
          "res.headers.set-cookie",
          "DATABASE_URL",
        ],
        censor: "[REDACTED]",
      },
    },
  };
}
