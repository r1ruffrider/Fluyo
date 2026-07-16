import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { appConfig } from "./config/app.config";
import { databaseConfig } from "./config/database.config";
import { validateEnvironment } from "./config/environment";
import { createLoggerConfig } from "./config/logger.config";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ["../../.env", ".env"],
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot(createLoggerConfig()),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
