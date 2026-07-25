import "reflect-metadata";

import { API_V1_PREFIX } from "@fluyo/shared";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix(API_V1_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    credentials: true,
    origin: config.getOrThrow<string>("app.webOrigin"),
  });
  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>("app.port"), "0.0.0.0");
}

void bootstrap();
