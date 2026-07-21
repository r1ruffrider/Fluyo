import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { BillingController } from "./billing.controller";
import { billingPlanDefinitionsProvider } from "./billing-plan-definitions.provider";
import { BillingPlanCatalogService } from "./billing-plan-catalog.service";
import { EntitlementsService } from "./entitlements.service";
import { stripeClientProvider } from "./stripe-client.provider";
import { StripeCheckoutService } from "./stripe-checkout.service";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BillingController],
  providers: [
    billingPlanDefinitionsProvider,
    stripeClientProvider,
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCheckoutService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
  ],
  exports: [
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCheckoutService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
  ],
})
export class BillingModule {}
