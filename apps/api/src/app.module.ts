import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { billingConfig } from "./config/billing.config";
import { databaseConfig } from "./config/database.config";
import { validateEnvironment } from "./config/environment";
import { createLoggerConfig } from "./config/logger.config";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { ProfilesModule } from "./profiles/profiles.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ["../../.env", ".env"],
      isGlobal: true,
      load: [appConfig, authConfig, billingConfig, databaseConfig],
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot(createLoggerConfig()),
    AuthModule,
    BillingModule,
    DatabaseModule,
    HealthModule,
    ProfilesModule,
  ],
})
export class AppModule {}
