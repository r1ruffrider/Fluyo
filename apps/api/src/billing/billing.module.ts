import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { BillingPlanCatalogService } from "./billing-plan-catalog.service";
import { BILLING_PLAN_DEFINITIONS } from "./billing.tokens";
import { EntitlementsService } from "./entitlements.service";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: BILLING_PLAN_DEFINITIONS, useValue: [] },
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
  ],
  exports: [
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
  ],
})
export class BillingModule {}
