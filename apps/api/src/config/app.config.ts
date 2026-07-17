import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
}));
