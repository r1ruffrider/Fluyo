import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [AuthModule, BillingModule, DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
